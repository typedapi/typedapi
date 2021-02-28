import * as http from "http"
import {
    JsonEncoderInterface,
    RequestError,
    ServerMessage,
    ClientMessage,
    ServerEventMessage,
    ServerSystemMessage,
    ServerMetadata,

} from "typedapi-core"
import { ObjectProxy } from "../ObjectProxy"
import { LoggerInterface, TextLogger } from "../log"
import { SessionProviderInterface, MemorySessionProvider } from "../session"
import { ConnectionData, AuthData, } from "../auth"
import { MethodProxy } from "../MethodProxy"
import { EventsProxy } from "../EventsProxy"
import { ApiMap } from "../ApiMap"
import { EventCallbackMetadata } from "../events"
import { ApiItemMetadata } from "../decorators"
import { isApiClientMessageInterfaceArray } from "../clientDataReflections"

export interface HttpServerConfig {
    serverMetadata?: ServerMetadata,
    jsonEncoder?: JsonEncoderInterface
    requestValidator?: { (request: http.IncomingMessage, response: http.ServerResponse): Promise<boolean> }
    objectProxy?: ObjectProxy
    logger?: LoggerInterface
    sessionProvider?: SessionProviderInterface
    sessionIdKey?: string
    apiMap: ApiMap
    maxMessageLength?: number
    pollingWaitTime?: number
    connectionLifetime?: number
    connectionIdKey?: string
    checkConnectionsInterval?: number
}

const SESSION_ID_KEY_DEFAULT = "typedapi.sid"
const CONNECTION_ID_KEY_DEFAULT = "typedapi.cid"
const MAX_MESSAGE_LENGTH_DEFAULT = 256 * 1024
const POLLING_WAIT_TIME_DEFAULT = 1000 * 15
const CONNECTION_LIFETIME_DEFAULT = 1000 * 30
const CHECK_CONNECTIONS_INTERVAL_DEFAULT = 5000

interface HttpServerConnection {
    id: string
    sessionId: string
    authData: AuthData
    eventResponse?: http.ServerResponse
    lastActivity: number
}

/**
 * Http server implementation
 * Tasts:
 * - Receive http request
 * - Validate request is it valid json with ClientMessage[]
 * - Validate request is it valid data for current method
 * - call api`s method
 * - return response
 * - hold polling connection and wait for event from EventsProxy, then send event
 * - Authorizing clients using AuthDataResponse response from api method
 */
export class HttpServer {

    private jsonEncoder: JsonEncoderInterface
    private logger: LoggerInterface
    private sessionProvider: SessionProviderInterface
    private sessionIdKey: string
    private connectionIdKey: string
    private methodProxy: MethodProxy
    private objectProxy: ObjectProxy
    private apiMap: ApiMap
    private maxMessageLength: number
    private connections: Map<string, HttpServerConnection> = new Map
    private connectionsData: Map<string, ConnectionData> = new Map
    private eventsProxy: EventsProxy
    private haveEvents = false
    private pendingMessages: Map<string, string[]> = new Map
    private pollingWaitTime: number
    private connectionLifetime: number
    private checkConnectionsTimer: NodeJS.Timeout
    private serverMetadata: ServerMetadata

    constructor(private config: HttpServerConfig) {
        this.jsonEncoder = config.jsonEncoder ?? JSON
        this.logger = config.logger ?? new TextLogger(console.log, console.error)
        this.sessionProvider = config.sessionProvider ?? new MemorySessionProvider
        this.sessionIdKey = config.sessionIdKey ?? SESSION_ID_KEY_DEFAULT
        this.objectProxy = config.objectProxy ?? new ObjectProxy
        this.pollingWaitTime = config.pollingWaitTime ?? POLLING_WAIT_TIME_DEFAULT
        this.connectionLifetime = config.connectionLifetime ?? CONNECTION_LIFETIME_DEFAULT
        this.methodProxy = new MethodProxy({
            apiMap: this.config.apiMap
        })
        this.apiMap = config.apiMap
        this.maxMessageLength = config.maxMessageLength ?? MAX_MESSAGE_LENGTH_DEFAULT
        this.haveEvents = this.apiMap.events.size > 0 || this.apiMap.parametricEvents.size > 0
        this.eventsProxy = new EventsProxy(this.apiMap)
        if (this.haveEvents) {
            this.eventsProxy.onSend.subscribe(d => this.sendEvent(d.data, d.meta, d.eventMeta))
        }
        this.connectionIdKey = config.connectionIdKey ?? CONNECTION_ID_KEY_DEFAULT
        this.checkConnectionsTimer = setInterval(() => this.checkConnections(), config.checkConnectionsInterval ?? CHECK_CONNECTIONS_INTERVAL_DEFAULT)
        this.serverMetadata = config.serverMetadata ?? {
            name: "TypedAPI HTTP Server",
            version: "0",
        }
        if (this.apiMap.broadcastEvents.size) {
            this.serverMetadata.broadcastEvents = Array.from(this.apiMap.broadcastEvents)
        }
    }

    async handleRequest(request: http.IncomingMessage, response: http.ServerResponse): Promise<void> {
        if (this.config.requestValidator) {
            const result = await this.config.requestValidator(request, response)
            if (!result) {
                response.statusCode = 300
                response.end("Bad request")
                return
            }
        }
        if (request.method !== "POST") {
            response.statusCode = 300
            response.end("Bad request")
            return
        }
        const body: Uint8Array[] = []
        request.on("data", chunk => body.push(chunk))
        request.on("end", () => this.handleStringRequest(Buffer.concat(body).toString(), request, response))
    }

    private async handleStringRequest(stringData: string, request: http.IncomingMessage, response: http.ServerResponse) {
        try {
            if (stringData.length > this.maxMessageLength) {
                response.statusCode = 300
                response.end("Bad request")
                return
            }
            const data = this.jsonEncoder.parse(stringData)
            if (!isApiClientMessageInterfaceArray(data)) {
                throw new RequestError("Bad request data")
            }
            if (!data.length) {
                throw new RequestError("No data")
            }
            const cookies = parseCookies(request)
            let sessionId = cookies[this.sessionIdKey]
            if (sessionId) {
                const authdata = await this.sessionProvider.get(sessionId)
                if (!authdata) {
                    sessionId = undefined
                }
            }
            if (!sessionId) {
                sessionId = await this.sessionProvider.create()
                response.setHeader("Set-Cookie", `${this.sessionIdKey}=${sessionId}`)
            }
            const authData = await this.sessionProvider.get(sessionId)
            /* istanbul ignore next */
            if (!authData) {
                console.error("No auth data received")
                response.statusCode = 500
                response.end("Server error")
                return
            }
            /* istanbul ignore next */
            const connectionData: ConnectionData = {
                authData: authData,
                ip: request.socket.remoteAddress ?? "",
                sessionId: sessionId,
            }
            const responseData: ServerMessage[] = []
            let isNewConnection = true
            let connectionId = cookies[this.connectionIdKey]
            let connection: HttpServerConnection | undefined
            if (this.haveEvents) {
                connection = this.connections.get(connectionId ?? "")

                if (!connectionId || !connection || connection.sessionId !== sessionId) {
                    connectionId = this.getNextConnectionId()
                    connection = {
                        authData: authData,
                        id: connectionId,
                        lastActivity: Date.now(),
                        sessionId: sessionId,
                    }
                    connectionData.connectionId = connectionId
                    this.connections.set(connectionId, connection)
                    this.connectionsData.set(connectionId, connectionData)
                } else {
                    connectionData.connectionId = connectionId
                    isNewConnection = false
                }
            }
            if (data.length === 1 && data[0][1] === "_.ping") {
                responseData.push([
                    "r",
                    data[0][0],
                    "pong",
                ])
                if (isNewConnection && connection) {
                    responseData.push([
                        "sys",
                        {
                            setConnectionId: connectionId
                        }
                    ])
                }
                response.setHeader("Content-Type", "application/json")
                response.end(this.jsonEncoder.stringify(responseData))
                return
            }
            if (data.length === 1 && data[0][1] === "_.polling" && connection) {
                connection.lastActivity = Date.now()
                const pendingMessages = this.pendingMessages.get(connection.id)
                if (pendingMessages && pendingMessages.length) {
                    response.setHeader("Content-Type", "application/json")
                    response.end("[" + pendingMessages.join(",") + "]")
                    this.pendingMessages.delete(connection.id)
                } else if (isNewConnection) {
                    const responseData: ServerSystemMessage[] = [["sys", {
                        setConnectionId: connectionId
                    }]]
                    response.setHeader("Content-Type", "application/json")
                    response.end(this.jsonEncoder.stringify(responseData))
                } else {
                    connection.eventResponse = response
                }
                return

            } else {
                if (connection) {
                    if (isNewConnection) {
                        responseData.push([
                            "sys",
                            {
                                setConnectionId: connectionId
                            }
                        ])
                    }
                    connection.lastActivity = Date.now()
                }
                for (const dataItem of data) {
                    const responseItem = await this.handleDataRequest(dataItem, connectionData)
                    responseData.push(responseItem)
                }
            }
            response.setHeader("Content-Type", "application/json")
            response.end(this.jsonEncoder.stringify(responseData))
        } catch (err) {
            this.logger.serverError("many", {}, err.message + "\n" + err.stack, { ip: "", authData: {} })
            response.statusCode = 300
            response.end("Bad request")
        }
    }

    private async handleDataRequest(data: ClientMessage, connectionData: ConnectionData): Promise<ServerMessage> {
        let returnValue: ServerMessage
        try {
            const method = data[1]
            if (method.startsWith("_.")) {
                returnValue = await this.handleSystemDataRequest(data, connectionData)
            } else {
                returnValue = await this.handleApiDataRequest(data, connectionData)
            }
        } catch (err) {
            returnValue = this.objectProxy.responseFromError({
                err,
                connectionData,
                requestId: data[0],
                logger: this.logger,
                input: data[2],
                method: data[1],
            })
        }
        return returnValue
    }

    private async handleApiDataRequest(data: ClientMessage, connectionData: ConnectionData): Promise<ServerMessage> {

        const method = data[1]
        const methodReflection = this.apiMap.methods.get(method)

        if (!methodReflection) {
            throw new RequestError(`Method ${method} not found`)
        }

        let startTime: number | undefined
        if (methodReflection.metadata.logConfig !== false) startTime = Date.now()

        const returnValue: ServerMessage = await this.methodProxy.callByClientMesssage(data, connectionData)

        const responseReflection = methodReflection.reflection.return
        if (returnValue[0] === "r" && responseReflection?.type === "injection") {
            switch (responseReflection.injectionType) {
                case "AuthDataServerResponse": {
                    const responseData = returnValue[2] as Record<string, unknown>
                    const newAuthData = responseData.newAuthData as AuthData
                    const oldAuthData = connectionData.authData
                    returnValue[2] = !!responseData.response
                    if (!newAuthData.id && oldAuthData.id) {
                        this.logger.logout(connectionData)
                    }
                    /* istanbul ignore next */
                    if (!connectionData.sessionId) {
                        throw new Error("No session id in connection data")
                    }
                    await this.sessionProvider.update(connectionData.sessionId, newAuthData)
                    connectionData.authData = newAuthData

                    /* istanbul ignore next */
                    if (!connectionData.connectionId) {
                        throw new Error("No connection id")
                    }
                    const currentConnection = this.connections.get(connectionData.connectionId)
                    this.connections.set(connectionData.connectionId, {
                        authData: newAuthData,
                        id: connectionData.connectionId,
                        lastActivity: Date.now(),
                        sessionId: connectionData.sessionId,
                        eventResponse: currentConnection && currentConnection.eventResponse ? currentConnection.eventResponse : undefined,
                    })
                    this.connectionsData.forEach(item => {
                        if (item.sessionId === connectionData.sessionId) {
                            item.authData = newAuthData
                        }
                    })
                    if (newAuthData.id && !oldAuthData.id) {
                        this.logger.login(connectionData)
                    }
                    break
                }
                default:
                    throw new Error(`Bad injection: ${responseReflection.injectionType}`)
            }
        }

        if (startTime) {
            this.logger.methodCall(
                method,
                Date.now() - startTime,
                methodReflection.metadata.logConfig !== "outputOnly" ? data[2] : undefined,
                methodReflection.metadata.logConfig !== "inputOnly" ? returnValue[2] : undefined,
                connectionData
            )
        }

        return returnValue
    }

    private handleSystemDataRequest(data: ClientMessage, connectionData: ConnectionData): Promise<ServerMessage> {
        const method = data[1]
        if (this.haveEvents) {
            if (method === "_.sub" || method === "_.unsub") {
                return this.eventsProxy.subscribeToEventFromRequest(data, connectionData)
            }
        }
        if (method === "_.v") {
            return Promise.resolve(["r", data[0], this.serverMetadata.version])
        }
        if (method === "_.meta") {
            return Promise.resolve(["r", data[0], this.serverMetadata])
        }
        throw new RequestError(`Method ${method} not found`)
    }

    private sendEvent(data: ServerEventMessage, meta: EventCallbackMetadata | undefined, eventMeta: ApiItemMetadata) {
        const encodedData = this.jsonEncoder.stringify(data)
        if (meta) {
            switch (meta[0]) {

                // for user
                case "u":
                    this.connections.forEach(connection => {
                        if (connection.authData.id === meta[1]) this.sendToConnection(connection, encodedData)
                    })
                    break

                // for connection
                case "c": {
                    const connection = this.connections.get(meta[1])
                    if (connection) {
                        this.sendToConnection(connection, encodedData)
                    }
                    break
                }
                // for group
                case "g":
                    this.connections.forEach(connection => {
                        if (connection.authData.groups && connection.authData.groups.indexOf(meta[1]) !== -1) this.sendToConnection(connection, encodedData)
                    })
                    break

                // for session
                case "s":
                    this.connections.forEach(connection => {
                        if (connection.sessionId === meta[1]) this.sendToConnection(connection, encodedData)
                    })
                    break
            }
        } else if (eventMeta.broadcastEvent) {
            this.connections.forEach(connection => this.sendToConnection(connection, encodedData))
        } else {
            this.eventsProxy.getSubscriptions(data[1])?.forEach(connectionId => {
                const connection = this.connections.get(connectionId)
                /* istanbul ignore else */
                if (connection) {
                    this.sendToConnection(connection, encodedData)
                }
            })
        }
    }

    private sendToConnection(connection: HttpServerConnection, data: string) {
        const response = connection.eventResponse
        if (response) {
            response.setHeader("Content-Type", "application/json")
            response.end(`[${data}]`)
            this.pendingMessages.delete(connection.id)
            delete connection.eventResponse
        } else {
            const pendingArray = this.pendingMessages.get(connection.id)
            if (pendingArray) {
                pendingArray.push(data)
            } else {
                this.pendingMessages.set(connection.id, [data])
            }
        }
    }

    private connectionIdIndex = 0

    private getNextConnectionId(): string {
        if (this.connectionIdIndex >= Number.MAX_SAFE_INTEGER) this.connectionIdIndex = 0
        return (++this.connectionIdIndex).toString()
    }

    private dropConnection(connectionId: string) {
        this.connectionsData.delete(connectionId)
        const connectionInfo = this.connections.get(connectionId)
        /* istanbul ignore next */
        if (!connectionInfo) {
            throw new Error("No connection info")
        }
        if (connectionInfo.eventResponse) {
            connectionInfo.eventResponse.setHeader("Content-Type", "application/json")
            connectionInfo.eventResponse.end("[]")
            delete connectionInfo.eventResponse
        }
        this.connections.delete(connectionId)
        this.pendingMessages.delete(connectionId)
        this.eventsProxy.dropConnection(connectionId)
    }

    private checkConnections() {
        const deleteConnectionIds: string[] = []
        const pollingMinActivity = Date.now() - this.pollingWaitTime
        const sheduleMinActivity = Date.now() - this.connectionLifetime
        this.connections.forEach(c => {
            if (c.eventResponse && c.lastActivity < pollingMinActivity
                || !c.eventResponse && c.lastActivity < sheduleMinActivity) {

                deleteConnectionIds.push(c.id)

            }
        })
        deleteConnectionIds.map(id => this.dropConnection(id))
    }

    destroy(): void {
        clearInterval(this.checkConnectionsTimer)
    }

}

/**
 * parse cookies implementation
 */
const parseCookies = (request: http.IncomingMessage) => {
    const list: { [key: string]: string | undefined } = {},
        rc = request.headers.cookie

    rc && rc.split(";").forEach(function (cookie) {
        const parts = cookie.split("=")
        const part = parts.shift()
        if (part) {
            list[part.trim()] = decodeURI(parts.join("="))
        }
    })

    return list
}