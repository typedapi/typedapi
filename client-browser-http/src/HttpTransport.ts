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
    sessionIdKey?: string
    connectionIdKey?: string
}

const CONNECTION_ID_KEY_DEFAULT = "typedapi.cid"
const MAX_CONNECTION_ATTEMPTS_DEFAULT = 3

interface ResponseParametersListItem {
    data: ClientMessage
    resolve: { (data: ServerMessage): void }
    reject: { (data: unknown): void }
}


export class HttpTransport implements TransportInterface {

    private connectionIdKey: string
    private connectionAttempts = 0
    private responsePromises: Map<number, ResponseParametersListItem> = new Map
    private connectionId: string | undefined
    private maxConnectionAttemps: number

    private connectionStatus: TransportConnectionStatus = "disconnected"
    readonly onMessage = new CoreEvent<ServerMessage>()
    readonly connectionStatusChanged = new CoreEvent<TransportConnectionStatus>()

    constructor(private config: HttpTransportConfig) {
        this.connectionIdKey = config.connectionIdKey ?? CONNECTION_ID_KEY_DEFAULT
        this.maxConnectionAttemps = config.maxConnectionAttemps ?? MAX_CONNECTION_ATTEMPTS_DEFAULT
    }

    send(data: ClientMessage): Promise<ServerMessage> {

        const promise = new Promise<ServerMessage>((resolve, reject) => {
            this.responsePromises.set(data[0], { resolve, reject, data })
        })
        setTimeout(() => this.sendData(), 0)
        return promise
    }

    private async sendData() {
        const responsePromises = this.responsePromises
        if (responsePromises.size || this.connectionStatus === "connecting") {
            return
        }
        if (this.connectionStatus !== "connected") {
            const err = new NotConnectedError()
            responsePromises.forEach(rp => rp.reject(err))
            return
        }
        this.responsePromises = new Map
        await this.sendResponsePromises(responsePromises)
    }

    private async sendResponsePromises(responsePromises: Map<number, ResponseParametersListItem>) {
        const dataToSend: ClientMessage[] = []
        responsePromises.forEach(rp => dataToSend.push(rp.data))
        try {
            const responseData = await this.madeRequest(dataToSend)
            for (const message of responseData) {
                if (message[0] === "r" || message[0] === "er") {
                    const responsePromise = this.responsePromises.get(message[1])
                    if (responsePromise) {
                        responsePromise.resolve(message)
                    }
                }
            }
        } catch (err) {
            if (err instanceof NotConnectedError && this.connectionStatus === "connected") {
                this.createConnection()
            }
            responsePromises.forEach(rp => rp.reject(err))
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

    private createConnection() {
        this.setConnectionStatus("connecting")
        const responsePromise: ResponseParametersListItem = {
            data: [0, "_.ping"],
            resolve: () => {
                this.connectionAttempts = 0
                this.setConnectionStatus("connected")
            },
            reject: () => {
                this.connectionAttempts++
                if (this.connectionAttempts < this.maxConnectionAttemps) {
                    setInterval(() => this.createConnection(), 300)
                }
            }
        }
        const map = new Map<number, ResponseParametersListItem>()
        map.set(0, responsePromise)
        this.sendResponsePromises(map)
    }

    private log(text: string, ...args: unknown[]) {
        if (!this.config.logging) return
        console.log(`ws: ${text}`, ...args)
    }

    private async madeRequest(data: ClientMessage[]): Promise<ServerMessage[]> {
        try {
            const headers: Record<string, string> = {
                "Content-Type": "application/json"
            }
            if (this.connectionId) {
                headers.cookie = `${this.connectionIdKey}=${this.connectionId};`
            }
            const result = await fetch(this.config.url, {
                body: JSON.stringify(data),
                method: "POST",
                headers,
            })
            const resultText = await result.text()
            const resultData: ServerMessage[] = JSON.parse(resultText)
            for (const resultItem of resultData) {
                if (resultItem[0] === "sys" && resultItem[1].setConnectionId) {
                    this.connectionId = resultItem[1].setConnectionId
                }
            }
            return resultData
        } catch (err) {
            throw new NotConnectedError(err.message)
        }
    }
}