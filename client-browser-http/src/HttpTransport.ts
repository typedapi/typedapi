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
}

const SESSION_ID_KEY_DEFAULT = "typedapi.sid"

interface ResponseParametersListItem {
    data: ClientMessage
    resolve: { (data: ServerMessage): void }
    reject: { (data: unknown): void }
}


export class HttpTransport implements TransportInterface {

    private sessionIdKey: string
    private connectionAttempts = 0
    private currentConnectionId: string | undefined
    private responsePromises: Map<number, ResponseParametersListItem> = new Map

    private connectionStatus: TransportConnectionStatus = "disconnected"
    readonly onMessage = new CoreEvent<ServerMessage>()
    readonly connectionStatusChanged = new CoreEvent<TransportConnectionStatus>()

    constructor(private config: HttpTransportConfig) {
        this.sessionIdKey = config.sessionIdKey ?? SESSION_ID_KEY_DEFAULT
    }

    send(data: ClientMessage): Promise<ServerMessage> {

        const promise = new Promise<ServerMessage>((resolve, reject) => {
            this.responsePromises.set(data[0], { resolve, reject, data })
        })
        setTimeout(() => this.sendData(), 0)
        return promise
    }

    private async sendData() {
        if (!this.responsePromises.size) return
        const responsePromises = this.responsePromises
        this.responsePromises = new Map
        const dataToSend: ClientMessage[] = []
        responsePromises.forEach(rp => dataToSend.push(rp.data))
        try {
            //const responseData = await this.madeRequest(dataToSend)
            console.log(dataToSend)
        } catch (err) {
            console.error(err)
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

    }

    private log(text: string, ...args: unknown[]) {
        if (!this.config.logging) return
        console.log(`ws: ${text}`, ...args)
    }

    private async madeRequest(data: ClientMessage[]): Promise<ServerMessage[]> {
        try {
            const result = await fetch(this.config.url, {
                body: JSON.stringify(data),
                method: "POST"
            })
            const resultText = await result.text()
            const resultData: ServerMessage[] = JSON.parse(resultText)
            for (const resultItem of resultData) {
                if (resultItem[0] === "sys" && resultItem[1].setConnectionId) {
                    this.currentConnectionId = resultItem[1].setConnectionId
                }
            }
            return resultData
        } catch (err) {
            throw new NotConnectedError(err.message)
        }
    }
}