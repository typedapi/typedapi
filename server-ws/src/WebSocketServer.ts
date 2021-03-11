import * as http from "http"
import {
    server as WsServer,
    request as WsRequest,
    connection as WsConnection,
    IMessage,
} from "websocket"
import {
    JsonEncoderInterface,
    RequestError,
    ServerMessage,
    ClientMessage,
} from "typedapi-core"
import {
    ConnectionData,
    SessionProviderInterface,
    MemorySessionProvider,
    MethodProxy,
    ApiMap,
    LoggerInterface,
    TextLogger,
    EventsProxy,
    AuthData,
    ObjectProxy,
    isApiClientMessageInterface,
    EventsProxyOnSendData,
    getUsageStatus,
} from "typedapi-server"

interface RequestValidatorInterface {
    (request: WsRequest): Promise<boolean>
}

export interface WebSocketServerConfig {
    port: number
    requestListener?: http.RequestListener
    requestValidator?: RequestValidatorInterface
    sessionIdKey?: string
    sessionProvider?: SessionProviderInterface
    jsonEncoder?: JsonEncoderInterface
    objectProxy?: ObjectProxy
    logger?: LoggerInterface
    maxMessageLength?: number
    apiMap: ApiMap
    wsServer?: WsServer
    logStatusInterval?: number
}

const SESSION_ID_KEY_DEFAULT = "typedapi.sid"
const MAX_MESSAGE_LENGTH_DEFAULT = 256 * 1024
const LOG_STATUS_INTERVAL_DEFAULT = 1000 * 60

export class WebSocketServer {

    private connections: Map<WsConnection, ConnectionData> = new Map
    private websocketServer: WsServer
    private requestValidator?: RequestValidatorInterface
    private sessionIdKey: string
    private sessionProvider: SessionProviderInterface
    private jsonEncoder: JsonEncoderInterface
    private objectProxy: ObjectProxy
    private methodProxy: MethodProxy
    private eventsProxy: EventsProxy
    private maxMessageLength: number
    private port: number
    private apiMap: ApiMap
    private httpServer: http.Server | undefined
    private logger: LoggerInterface
    private logStatusInterval: number
    private logStatusTimer: NodeJS.Timeout

    constructor(config: WebSocketServerConfig) {
        if (config.wsServer) {
            this.websocketServer = config.wsServer
        } else {
            this.httpServer = http.createServer(config.requestListener)
            this.websocketServer = new WsServer({
                httpServer: this.httpServer,
                autoAcceptConnections: !!this.requestValidator
            })
        }
        this.requestValidator = config.requestValidator
        this.websocketServer.on("request", request => this.handleRequest(request))
        this.sessionIdKey = config.sessionIdKey ?? SESSION_ID_KEY_DEFAULT
        this.sessionProvider = config.sessionProvider ?? new MemorySessionProvider
        this.jsonEncoder = config.jsonEncoder ?? JSON
        this.objectProxy = config.objectProxy ?? new ObjectProxy
        this.maxMessageLength = config.maxMessageLength ?? MAX_MESSAGE_LENGTH_DEFAULT
        this.port = config.port
        this.apiMap = config.apiMap

        this.logger = config.logger ?? new TextLogger(console.log, console.error)

        this.methodProxy = new MethodProxy({
            apiMap: config.apiMap,
        })

        this.eventsProxy = new EventsProxy(config.apiMap)

        this.eventsProxy.onSend.subscribe(data => this.sendEvent(data))

        if (this.httpServer) {
            this.httpServer.listen(this.port)
        }
        this.logStatusInterval = config.logStatusInterval ?? LOG_STATUS_INTERVAL_DEFAULT
        this.logStatusTimer = setInterval(() => this.logStatus(), this.logStatusInterval)
    }

    private async handleRequest(request: WsRequest) {
        let connection: WsConnection | undefined
        try {
            if (this.requestValidator) {
                const validationResult = await this.requestValidator(request)
                if (!validationResult) {
                    request.reject()
                    return
                }
            }
            connection = request.accept("echo-protocol", request.origin)
            await this.handleConnection(connection, request)
        } catch (err) {
            // @todo remove ignore
            /* istanbul ignore if */
            if (connection) {
                connection.close(undefined, "handleConnectionError")
            } else {
                request.reject()
            }
        }
    }

    private async handleConnection(wsConnection: WsConnection, req: WsRequest) {
        wsConnection.on("message", message => this.handleMessage(wsConnection, message))
        wsConnection.on("close", (reasonCode: number, description: string) => this.handleClose(wsConnection, reasonCode, description))
        let sessionId: string | null = null
        for (const cookie of req.cookies) {
            if (cookie.name === this.sessionIdKey) {
                sessionId = cookie.value
            }
        }
        if (sessionId) {
            const authdata = await this.sessionProvider.get(sessionId)
            if (!authdata) {
                sessionId = null
            }
        }
        if (!sessionId) {
            sessionId = await this.sessionProvider.create()
            this.send(wsConnection, ["sys", { setSessionId: sessionId }])
        }
        const authData = await this.sessionProvider.get(sessionId)
        /* istanbul ignore next */
        if (!authData) {
            wsConnection.close(undefined, "NoAuthData")
            return
        }
        const connectionData: ConnectionData = {
            authData: authData,
            ip: wsConnection.remoteAddress,
            sessionId: sessionId,
            connectionId: makeid(),
        }
        this.connections.set(wsConnection, connectionData)
        this.logger.event("online", undefined, connectionData)
    }

    private sendEvent(data: EventsProxyOnSendData) {
        const eventData = data.data
        const meta = data.meta
        const encodedData = this.jsonEncoder.stringify(eventData)

        if (meta) {
            switch (meta[0]) {

                // for user
                case "u":
                    this.connections.forEach((connection, wsConnection) => {
                        if (connection.authData.id === meta[1]) this.sendString(wsConnection, encodedData)
                    })
                    break

                // for connection
                case "c": {
                    this.connections.forEach((connection, wsConnection) => {
                        if (connection.connectionId === meta[1]) {
                            this.send(wsConnection, eventData)
                            return false
                        }
                    })
                    break
                }
                // for group
                case "g":
                    this.connections.forEach((connection, wsConnection) => {
                        if (connection.authData.groups && connection.authData.groups.indexOf(meta[1]) !== -1) this.sendString(wsConnection, encodedData)
                    })
                    break

                // for session
                case "s":
                    this.connections.forEach((connection, wsConnection) => {
                        if (connection.sessionId === meta[1]) this.sendString(wsConnection, encodedData)
                    })
                    break
            }
        }
        else if (data.eventMeta.broadcastEvent) {
            this.websocketServer.broadcastUTF(encodedData)
        } else {
            const subscriptions = this.eventsProxy.getSubscriptions(eventData[1])
            if (subscriptions) {
                this.connections.forEach((connection, wsConnection) => {
                    /* istanbul ignore next */
                    if (!connection.connectionId) {
                        console.error(`no connection id ${JSON.stringify(connection)}`)
                        return
                    }
                    if (subscriptions.has(connection.connectionId)) {
                        this.sendString(wsConnection, encodedData)
                    }
                })
            }
        }
        this.logger.event(data.data[1], data.data[2])
        //this.send(data.data[2], data.data)
    }

    private send(connection: WsConnection, data: ServerMessage) {
        this.sendString(connection, this.jsonEncoder.stringify(data))
    }

    private sendString(connection: WsConnection, data: string) {
        /* istanbul ignore next */
        if (!connection.connected) return
        connection.send(data)
    }

    stop(): Promise<void> {
        this.websocketServer.shutDown()
        if (this.httpServer) {
            const server = this.httpServer
            return new Promise(resolve => {
                server.close(err => {
                    /* istanbul ignore next */
                    if (err) {
                        this.logger.serverError("server_closing", "", err.message + "\n" + err.stack, { authData: {}, ip: "" })
                    }
                    resolve()
                })
            })
        }
        return Promise.resolve()
    }

    private async handleMessage(connection: WsConnection, message: IMessage) {
        if (!message.utf8Data || message.utf8Data.length > this.maxMessageLength) {
            connection.close(undefined, "Bad message")
            return
        }
        let data: unknown
        try {
            data = this.jsonEncoder.parse(message.utf8Data)
        } catch (err) {
            connection.close(undefined, "Bad json sent")
            return
        }
        if (!isApiClientMessageInterface(data)) {
            connection.close(undefined, "bad message")
            return
        }
        let returnValue: ServerMessage
        try {
            returnValue = await this.handleDataMessage(connection, data)
        } catch (err) {
            this.logger.serverError("", data, err.message + "\n" + err.stack, { ip: "", authData: {} })
            returnValue = ["er", data[0], "ServerError", {}]
        }
        this.send(connection, returnValue)
    }

    private async handleDataMessage(connection: WsConnection, data: ClientMessage): Promise<ServerMessage> {
        const connectionData = this.connections.get(connection)
        /* istanbul ignore next */
        if (!connectionData) {
            throw new Error("No connection data")
        }
        if (data[1].startsWith("_.")) {
            try {
                const returnValue = await this.handleSystemMessage(connection, data, connectionData)
                return returnValue
            } catch (err) {
                return this.objectProxy.responseFromError({
                    connectionData,
                    err,
                    logger: this.logger,
                    requestId: data[0],
                    input: data[2],
                    method: data[1],
                })
            }
        }
        const returnValue = await this.methodProxy.callByClientMesssage(data, connectionData)
        const methodReflection = this.apiMap.methods.get(data[1])
        /* istanbul ignore if */
        if (!methodReflection) {
            throw new Error("No method reflection")
        }
        const responseReflection = methodReflection.reflection.return
        if (responseReflection && responseReflection.type === "injection") {
            switch (responseReflection.injectionType) {
                case "AuthDataServerResponse": {
                    const authData = (returnValue[2] as Record<string, unknown>).newAuthData as AuthData
                    returnValue[2] = (returnValue[2] as Record<string, unknown>).response
                    const connData = this.connections.get(connection)
                    /* istanbul ignore else */
                    if (connData) {
                        if (!authData.id && connData.authData.id) {
                            this.logger.event("logout", undefined, connData)
                        }
                        connData.authData = authData
                        /* istanbul ignore else */
                        if (connData.sessionId) {
                            await this.sessionProvider.update(connData.sessionId, authData)
                        }
                        if (authData.id) {
                            this.logger.event("login", undefined, connData)
                        }
                    }
                    break
                }
                default:
                    throw new Error(`Bad injection: ${responseReflection.injectionType}`)
            }
        }
        return returnValue
    }

    private async handleSystemMessage(connection: WsConnection, messageData: ClientMessage, connectionData: ConnectionData): Promise<ServerMessage> {
        /* istanbul ignore next */
        if (!connectionData.connectionId) {
            throw new Error("Should be connection id")
        }
        if (messageData[1] === "_.sub" || messageData[1] === "_.unsub") {
            return this.eventsProxy.subscribeToEventFromRequest(messageData, connectionData)
        }
        throw new RequestError(`Method '${messageData[1]}' not found`)
    }

    private async handleClose(connection: WsConnection, reasonCode: number, description: string) {
        const data = this.connections.get(connection)
        /* istanbul ignore else */
        if (data) {
            data.ip += description
            this.logger.event("offline", undefined, data)
            this.connections.delete(connection)
        } else {
            console.error("no connection data when closing")
        }
    }

    private async logStatus() {
        const usage = await getUsageStatus()
        this.logger.status({
            usage,
            usersOnline: this.connections.size
        })
    }

    getConnections(): Map<WsConnection, ConnectionData> {
        return this.connections
    }

}

/**
 * make connection id
 */
const makeid = () => {
    let result = ""
    const characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789"
    const charactersLength = characters.length
    for (let i = 0; i < 20; i++) {
        result += characters.charAt(Math.floor(Math.random() * charactersLength))
    }
    return result
}