import { Event, ApiMap, NullLogger } from "typedapi-server"
import { WebSocketServer, WebSocketServerConfig } from "../../src/WebSocketServer"
import * as WebSocket from "websocket"
import { OutgoingHttpHeaders } from "http"

export const sleep = (ms: number) => new Promise<void>(resolve => setTimeout(resolve, ms))

export const waitFor = async (func: { (): boolean }, error: string | { (): string }, steps: number = 100, step: number = 1): Promise<void> => {
    for (let i = 0; i < steps; i++) {
        if (func()) return
        await sleep(step)
    }
    throw new Error(typeof error === "string" ? error : error())
}

export class TestBench {

    readonly onMessageRecevied = new Event<any>()
    wsServer: WebSocketServer
    client: WebSocket.client
    connection: WebSocket.connection | undefined
    wasMessage = false
    connectionError = false
    lastMessage: any
    destroyed = false
    closedReason = ""

    constructor(apiMap: ApiMap, wsConfig: Partial<WebSocketServerConfig> = {}, disableLogger: boolean = false) {
        wsConfig.apiMap = apiMap
        wsConfig.port = wsConfig.port ?? 8080
        wsConfig.logger = disableLogger ? undefined : (wsConfig.logger ?? new NullLogger)
        this.wsServer = new WebSocketServer(wsConfig as WebSocketServerConfig)
        this.client = new WebSocket.client()
        this.client.on("connectFailed", () => this.connectionError = true)
        this.client.on("connect", connection => {
            this.connection = connection
            connection.on("message", message => {
                if (message.utf8Data) {
                    this.wasMessage = true
                    let data = JSON.parse(message.utf8Data)
                    this.onMessageRecevied.fire(data)
                    this.lastMessage = data
                }
            })
            connection.on("close", (code, desc) => {
                this.closedReason = desc
                connection.removeAllListeners()
                this.connection = undefined
            })
        })
    }

    isConnected() {
        return !!this.connection
    }

    sendBytes(b: Buffer): Promise<void> {
        return new Promise<void>((resolve, reject) => {
            this.connection!.sendBytes(b, err => {
                if (err) {
                    return reject(err)
                }
                resolve()
            })
        })

    }

    send(message: any): Promise<void> {
        return this.sendString(JSON.stringify(message))
    }

    sendString(message: string): Promise<void> {
        return new Promise<void>((resolve, reject) => {
            this.connection!.send(message, err => {
                if (err) {
                    return reject(err)
                }
                resolve()
            })
        })
    }

    getLastMessage() {
        return this.lastMessage
    }

    async sendAndWaitForMessage(message: any) {
        this.send(message)
        return await this.waitForMessage(message)
    }

    async waitForMessage(message?: any) {
        this.wasMessage = false
        await waitFor(() => this.wasMessage && this.isConnected(), () => this.isConnected() ? `Message did not received${message ? " as response to " + JSON.stringify(message) : ""}` : "Connection closed: " + this.closedReason, 10)
        return this.lastMessage
    }

    async connect(headers?: OutgoingHttpHeaders) {
        this.client.connect("ws://localhost:8080", 'echo-protocol', undefined, headers)
        await waitFor(() => !!this.connection, `cant connect to server`)
    }

    async destroy() {
        if (this.destroyed) return
        this.destroyed = true
        await this.wsServer.stop()
        await waitFor(() => !this.connection, `cant disconnect`)
    }

}