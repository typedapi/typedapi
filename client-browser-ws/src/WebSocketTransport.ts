import {
    TransportInterface,
    TransportConnectionStatus,
    NotConnectedError,
    CoreEvent,
} from "typedapi-client"
import {
    ClientMessage,
    ServerMessage
} from "typedapi-core"

export interface WebSocketTransportConfig {
    url: string
    maxConnectionAttemps?: number
    logging?: boolean
    sessionIdKey?: string
}

const SESSION_ID_KEY_DEFAULT = "typedapi.sid"

export class WebSocketTransport implements TransportInterface {

    private connectionStatus: TransportConnectionStatus = "disconnected"
    private url: string
    private connectionAttemps = 0
    private maxConnectionAttemps: number
    private socket: WebSocket | null = null

    readonly onMessage = new CoreEvent<ServerMessage>()
    readonly connectionStatusChanged = new CoreEvent<TransportConnectionStatus>()

    constructor(private config: WebSocketTransportConfig) {
        this.url = config.url
        this.maxConnectionAttemps = config.maxConnectionAttemps ?? 3
        this.createSocket()
    }

    private setConnectionStatus(status: TransportConnectionStatus) {
        this.log(status)
        this.connectionStatus = status
        this.connectionStatusChanged.fire(this.connectionStatus)
    }

    private createSocket() {
        if (this.socket) {
            this.socket.onopen = this.socket.onclose = this.socket.onmessage = this.socket.onerror = null
            this.socket = null
        }
        this.setConnectionStatus("connecting")
        this.socket = new WebSocket(this.url, "echo-protocol")
        this.connectionAttemps++
        this.socket.onopen = () => {
            this.setConnectionStatus("connected")
            this.connectionAttemps = 0
        }
        this.socket.onclose = (event) => {
            if (event.code === 1000) {
                this.connectionAttemps = 0
                this.setConnectionStatus("disconnected")
                return
            }
            if (this.connectionAttemps < this.maxConnectionAttemps) {
                this.createSocket()
            } else {
                this.setConnectionStatus("disconnected")
            }
        }
        this.socket.onmessage = (event: MessageEvent) => this.onSocketMessage(event)
        this.socket.onerror = (error) => console.error(error)
    }

    private onSocketMessage(event: MessageEvent) {
        const data = JSON.parse(event.data) as ServerMessage
        this.log("received", data)
        if (data[0] ==="sys" && data[1].setSessionId) {
            const maxAge = 60 * 60 * 24 * 365
            const key = this.config.sessionIdKey ?? SESSION_ID_KEY_DEFAULT
            window.document.cookie = `${key}=${data[1].setSessionId}; path=/; max-age=${maxAge}; sameSite=strict`
            return
        }        
        this.onMessage.fire(data)
    }

    tryReconnect(): void {
        if (this.connectionStatus !== "disconnected") return
        this.connectionAttemps = 0
        this.createSocket()
    }

    async send(data: ClientMessage): Promise<unknown> {
        if (this.connectionStatus === "connecting") {
            return new Promise<unknown>((resolve, reject) => {
                setTimeout(async () => {
                    try {
                        const result = await this.send(data)
                        resolve(result)
                    } catch (err) {
                        reject(err)
                    }
                }, 300)
            })
        }
        if (this.connectionStatus !== "connected" || !this.socket) {
            throw new NotConnectedError
        }
        this.log("send", data)
        this.socket.send(JSON.stringify(data))
    }

    getConnectionStatus(): TransportConnectionStatus {
        return this.connectionStatus
    }

    private log(text: string, ...args: unknown[]) {
        if (!this.config.logging) return
        console.log(`ws: ${text}`, ...args)
    }
}