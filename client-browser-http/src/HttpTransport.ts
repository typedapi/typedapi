import {
    TransportInterface,
    TransportConnectionStatus,
    NotConnectedError,
    CoreEvent,
} from "typedapi-client"
import {
    ClientMessage,
    ServerMessage,
} from "typedapi-core"

export interface HttpTransportConfig {
    url: string
    maxConnectionAttemps?: number
    logging?: boolean
}

const MAX_CONNECTION_ATTEMPTS_DEFAULT = 3

export class HttpTransport implements TransportInterface {

    private connectionAttempts = 0

    private pendingMessages: ClientMessage[] = []

    private maxConnectionAttemps: number
    private destroyed = false

    private connectionStatus: TransportConnectionStatus = "disconnected"
    readonly onMessage = new CoreEvent<ServerMessage>()
    readonly connectionStatusChanged = new CoreEvent<TransportConnectionStatus>()

    constructor(private config: HttpTransportConfig) {
        this.maxConnectionAttemps = config.maxConnectionAttemps ?? MAX_CONNECTION_ATTEMPTS_DEFAULT
        this.log("Http transport created")
    }

    send(data: ClientMessage): Promise<void> {
        switch (this.connectionStatus) {
            case "connected":
                this.pendingMessages.push(data)
                setTimeout(() => this.sendPendingMessages(), 0)
                break
            case "connecting":
                this.pendingMessages.push(data)
                break
            default:
                this.onMessage.fire(["er", data[0], "NotConnectedError", "Not connected"])
        }
        return Promise.resolve()
    }

    async sendPendingMessages(): Promise<void> {
        if (!this.pendingMessages.length || this.connectionStatus !== "connected") return
        const pendingMessages = this.pendingMessages
        this.pendingMessages = []
        try {
            const responseData = await this.madeRequest(pendingMessages)
            responseData.forEach(item => this.onMessage.fire(item))
        } catch (err) {
            if (err instanceof NotConnectedError && this.connectionStatus === "connected") {
                this.createConnection()
            }
            pendingMessages.forEach(pm => this.onMessage.fire(["er", pm[0], "NotConnectedError", "Not connected"]))
        }
    }

    getConnectionStatus(): TransportConnectionStatus {
        return this.connectionStatus
    }

    private setConnectionStatus(status: TransportConnectionStatus) {
        this.log(status)
        this.connectionStatus = status
        this.connectionStatusChanged.fire(this.connectionStatus)
    }

    tryConnect(): void {
        if (this.connectionStatus !== "disconnected") return
        this.connectionAttempts = 0
        this.createConnection()
    }

    private async createConnection() {
        this.setConnectionStatus("connecting")
        try {
            const result = await this.madeRequest([[0, "_.ping"]])
            for (const resultItem of result) {
                if (resultItem[0] === "r" && resultItem[1] === 0 && resultItem[2] === "pong") {
                    this.setConnectionStatus("connected")
                    this.sendPendingMessages()
                    this.createPollingRequest()
                    break
                }
            }
        } catch (err) {
            this.connectionAttempts++
            if (this.connectionAttempts < this.maxConnectionAttemps) {
                setTimeout(() => this.createConnection(), 300)
            } else {
                this.setConnectionStatus("disconnected")
            }
        }
    }

    private log(text: string, ...args: unknown[]) {
        if (!this.config.logging) return
        console.log(`http: ${text}`, ...args)
    }

    private async madeRequest(data: ClientMessage[]): Promise<ServerMessage[]> {
        if (this.destroyed) return []
        try {
            data.forEach(d => this.log("out: ", d[0], d[1], d[2]))
            const headers: Record<string, string> = {
                "Content-Type": "application/json"
            }
            const result = await fetch(this.config.url, {
                body: JSON.stringify(data),
                method: "POST",
                headers,
                credentials: "include"
            })
            const resultData: ServerMessage[] = await result.json()
            resultData.forEach(d => this.log("in: ", d[0], d[1], d[2], d[3]))
            return resultData
        } catch (err) {
            this.log("request error: ", err)
            throw new NotConnectedError(err.message)
        }
    }

    private pollingSent = false

    private async createPollingRequest() {
        if (this.pollingSent) return
        this.pollingSent = true
        let wasError = false
        try {
            const result = await this.madeRequest([[0, "_.polling"]])
            for (const item of result) {
                this.onMessage.fire(item)
            }
        } catch (err) {
            wasError = true
            if (err instanceof NotConnectedError && this.connectionStatus === "connected") {
                this.createConnection()
            } else {
                console.error(err)
            }
        }
        this.pollingSent = false
        setTimeout(() => this.createPollingRequest(), wasError ? 1000 : 0)
    }

    destroy(): void {
        this.destroyed = true
    }
}