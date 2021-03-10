import * as http from "http"
import { Api } from "./utils/Realization"
import { Reflection } from "./utils/Reflection"
import {
    buildMap,
    HttpServer,
    NullLogger,
    HttpServerConfig,
    ApiMap,
    MemorySessionProvider,
    ObjectProxy,
} from "../src"
import * as request from "request"
import { Response } from "request"
import { ClientMessage, ServerMessage } from "typedapi-core"
import { TestLogger } from "./utils/TestLogger"


export const sleep = (ms: number) => new Promise<void>(resolve => setTimeout(resolve, ms))
type rec<T = unknown> = Record<string, T>

describe("HttpServer", () => {

    let api = new Api
    let apiMap: ApiMap
    let apiHttpServer: HttpServer
    let httpServer: http.Server
    let response: Response
    let err: any
    let body: any
    let lastConnectionId: string
    let lastSessionId: string

    const recreateHttpServer = (config: Partial<HttpServerConfig> = {}) => {
        if (apiHttpServer) {
            apiHttpServer.destroy()
        }
        apiMap = buildMap(Reflection, api)
        let thisConfig: HttpServerConfig = {
            apiMap,
            logger: new NullLogger
        }
        Object.assign(thisConfig, config)
        apiHttpServer = new HttpServer(thisConfig)
    }

    const createServer = (
        port: number = 8080,
        handler: { (req: http.IncomingMessage, res: http.ServerResponse): void } = (request, response) => {
            apiHttpServer.handleRequest(request, response)
        }
    ): Promise<http.Server> => {

        return new Promise<http.Server>((resolve, reject) => {
            const httpServer = http.createServer(handler)
            httpServer.on("listening", () => resolve(httpServer))
            httpServer.on("error", (err) => console.error(err))
            httpServer.listen(port)
        })
    }

    const awaitClose = (server: http.Server): Promise<void> => {
        return new Promise((resolve) => server.close(() => resolve()))
    }

    beforeAll(async () => {
        httpServer = await createServer()
        recreateHttpServer()
    })

    beforeEach(async () => {
        recreateHttpServer()
    })

    afterAll(async () => {
        if (httpServer && httpServer.listening) {
            await awaitClose(httpServer)
        }
    })

    interface ResponseResolver { (err: any, response: request.Response, body: any): void }

    const madeRequest = (message: ClientMessage[], headers?: request.Headers, method = "POST", resolver?: ResponseResolver, port = 8080): Promise<ServerMessage[]> => {
        return new Promise<ServerMessage[]>((resolve, reject) => {
            if (!headers) {
                let cookieArr: string[] = []
                if (lastSessionId) {
                    cookieArr.push(`typedapi.sid=${lastSessionId}`)
                }
                if (lastConnectionId) {
                    cookieArr.push(`typedapi.cid=${lastConnectionId}`)
                }
                if (cookieArr.length) {
                    headers = {
                        cookie: cookieArr.join(";")
                    }
                }
            }
            let timeout = setTimeout(() => {
                reject(new Error("Connection timeout"))
            }, 1000)
            request(`http://localhost:${port}/`, {
                method,
                json: method === "POST" ? message : undefined,
                headers,
            }, (requestErr, requestResponse, responseBody) => {
                clearTimeout(timeout)
                if (requestErr) {
                    return reject(requestErr)
                }
                response = requestResponse
                body = responseBody
                err = requestErr
                if (resolver) {
                    resolver(err, response, body)
                } else {
                    response.headers['set-cookie']?.forEach((item, index) => {
                        if (item.indexOf('typedapi.sid') !== -1) {
                            lastSessionId = item.replace("typedapi.sid=", "").replace(/;.+/, "")
                        }
                        if (item.indexOf('typedapi.cid') !== -1) {
                            lastConnectionId = item.replace("typedapi.cid=", "").replace(/;.+/, "")
                        }
                    })
                }

                if (response.statusCode !== 200) {
                    return reject(new Error(responseBody))
                } else if (!resolver) {
                    let res = responseBody as ServerMessage[]
                    for (let item of res) {
                        if (item[0] === "sys" && item[1].setConnectionId) {
                            lastConnectionId = item[1].setConnectionId
                        }
                    }
                    return resolve(res)
                } else {
                    return resolve(responseBody as ServerMessage[])
                }

            })
        })
    }

    it("bad request", async () => {
        await expect(madeRequest([], undefined, "GET")).rejects.toThrow()
        await expect(madeRequest([""] as any as ClientMessage[])).rejects.toThrow()
        await expect(madeRequest([])).rejects.toThrow()
    })

    it("requestValidator", async () => {

        recreateHttpServer({
            requestValidator: () => Promise.resolve(false)
        })

        await expect(madeRequest([[1, "books.count", []]])).rejects.toThrow()

        recreateHttpServer({
            requestValidator: () => Promise.resolve(true),
        })

        let result = await madeRequest([[1, "books.count", []]])

        expect(result.length).toEqual(1)

        expect(result[0][0]).toEqual("r")
        expect(result[0][2]).toEqual(0)

    })

    it("session", async () => {

        await madeRequest([[1, "books.count", []]])
        let sessionId = lastSessionId

        await madeRequest([[2, "testInjectionMethod7", []]])
        let result = await madeRequest([[2, "testInjectionMethod6", []]])
        expect((result[0][2] as rec<rec>).apiConnectionData.sessionId).toEqual(sessionId)
        result = await madeRequest([[1, "books.count", []]], { 'cookie': `typedapi.sid=123;typedapi.cid=${lastConnectionId};` })
        let newSessionId = lastSessionId
        expect(sessionId === newSessionId).toBeFalsy()

        expect(result.length).toEqual(1)
        expect(result[0][0]).toEqual("r")
        expect(result[0][2]).toEqual(0)
    })

    it("ping", async () => {
        let result = await madeRequest([[1, "_.ping", []]])
        expect(result.length).toEqual(1)
        expect(result[0][0]).toEqual("r")
        expect(result[0][1]).toEqual(1)
        expect(result[0][2]).toEqual("pong")
        result = await madeRequest([[2, "_.ping", []]])
        expect(result.length).toEqual(1)
        expect(result[0][0]).toEqual("r")
        expect(result[0][1]).toEqual(2)
        expect(result[0][2]).toEqual("pong")
    })

    it("polling", async () => {
        await madeRequest([[1, "_.ping", []]])
        let pollingPromise = madeRequest([[2, "_.polling", []]])
        api.broadCastEvent.fire(1)
        let result = await pollingPromise
        expect(result.length).toEqual(1)
        expect(result[0][0] === "ev").toBeTruthy()
        expect(result[0][1]).toEqual("broadCastEvent")
        expect(result[0][2]).toEqual(1)
        recreateHttpServer()
        result = await madeRequest([[2, "_.polling", []]])
        expect(result.length).toEqual(0)

        pollingPromise = madeRequest([[3, "_.polling", []]])
        await sleep(5)
        api.broadCastEvent.fire(123)
        result = await pollingPromise
        expect(result.length).toEqual(1)
        expect(result[0][0] === "ev").toBeTruthy()
        expect(result[0][1]).toEqual("broadCastEvent")
        expect(result[0][2]).toEqual(123)
    })

    it("method data", async () => {
        let result = await madeRequest([[1, "noExistsMethod", []]])
        expect(result.length).toEqual(1)
        expect(result[0][0] === "er").toBeTruthy()
        expect(result[0][3]).toEqual('Method noExistsMethod not found')
    })

    it("no events", async () => {
        recreateHttpServer({
            apiMap: buildMap({
                methods: {
                    hello: {
                        params: [{ type: "string" }],
                        return: { type: "string" }
                    }
                }
            }, {
                hello: (a: string) => {
                    return Promise.resolve(`Hello, ${a}!`)
                }
            })
        })
        api.testEvent.fire(25)
        await madeRequest([[1, "_.ping", []]])
        let result = await madeRequest([[2, "_.polling", []]])
        expect(result.length).toEqual(1)
        expect(result[0][0]).toEqual("er")
        expect(result[0][1]).toEqual(2)
        result = await madeRequest([[3, "hello", ["Sergey"]]])
        expect(result.length).toEqual(1)
        expect(result[0][0]).toEqual("r")
        expect(result[0][1]).toEqual(3)
        expect(result[0][2]).toEqual("Hello, Sergey!")
    })

    it("log", async () => {
        let logger = new TestLogger()
        recreateHttpServer({ logger })
        let response = await madeRequest([[1, "books.count", []]])
        expect(logger.logCalls.length).toEqual(1)
        response = await madeRequest([[1, "books.find", []]])
        expect(response[0][0]).toEqual("r")
        expect((response[0][2] as unknown[]).length).toEqual(0)
        expect(logger.logCalls.length).toEqual(1)

        logger = new TestLogger()
        recreateHttpServer({ logger })

        await madeRequest([[2, "testInjectionMethod7", []]])

        response = await madeRequest([[1, "books.create", [{ title: "title", description: "description" }]]])
        let id = (response[0][2] as any).id
        expect(logger.logCalls.length).toEqual(2)
        expect(logger.logCalls[1].input).toBeUndefined()
        expect(logger.logCalls[1].output).toEqual({
            id,
            title: "title",
            description: "description"
        })
        response = await madeRequest([[2, "books.get", [id]]])
        expect(logger.logCalls.length).toEqual(3)
        expect(logger.logCalls[2].output).toBeUndefined()
        expect(logger.logCalls[2].input).toEqual([id])
        expect((response[0][2] as any).id).toEqual(id)
        expect((response[0][2] as any).title).toEqual("title")

        apiHttpServer = new HttpServer({
            apiMap
        })
        expect((apiHttpServer as any).logger.logFunction).toEqual(console.log)
    })

    it("log status", async () => {
        let logger = new TestLogger()
        recreateHttpServer({ logger, logStatusInterval: 1000 })
        await sleep(2500)
        expect(logger.statusesData.length).toEqual(1)
    })

    it("logout", async () => {
        let logger = new TestLogger()
        recreateHttpServer({ logger })
        let result = await madeRequest([[2, "testInjectionMethod7", []]])
        expect(result[0][0]).toEqual("r")
        expect(result[0][1]).toEqual(2)
        expect(result[0][2]).toEqual(true)
        await madeRequest([[1, "books.count", []]], { 'cookie': `typedapi.sid=123;typedapi.cid=${lastConnectionId};` }, undefined, () => { })
        result = await madeRequest([[2, "logout", []]])
        expect(result[0][2]).toEqual(true)
        expect(logger.events.length).toEqual(2)
    })

    it("empty response", async () => {
        let result = await madeRequest([[2, "someMethod", []]])
        expect(result[0][0]).toEqual("r")
        expect(result[0][1]).toEqual(2)
        expect(result[0][2]).toBeUndefined()
    })

    it("bad injection", async () => {
        let logger = new TestLogger()
        recreateHttpServer({ logger })
        let result = await madeRequest([[2, "testInjectionMethod5x", []]],)
        expect(result[0][0]).toEqual("er")
        expect(result[0][1]).toEqual(2)
        expect(result[0][2]).toEqual("ServerError")
        expect(logger.logErrorCalls[0].error.indexOf("Bad injection: fakeInjection") !== -1).toBeTruthy()
    })

    it("events", async () => {
        await madeRequest([[1, "someMethod", []]])
        let result = await madeRequest([[2, "_.sub", {
            event: "testEvent"
        }]])
        expect(result.length).toEqual(1)
        expect(result[2]).toBeUndefined()

        await madeRequest([[3, "testInjectionMethod7", []]])

        api.testEvent.fireForUser(1, 123)
        api.testEvent.fireForUser(1, 1234)

        result = await madeRequest([[4, "_.polling", []]])
        expect(result.length).toEqual(1)
        expect(result[0][0]).toEqual("ev")
        expect(result[0][1]).toEqual("testEvent")
        expect(result[0][2]).toEqual(1)

        recreateHttpServer()

        await madeRequest([[2, "_.sub", {
            event: "testEvent"
        }]])

        let pollingResult = madeRequest([[5, "_.polling", []]])
        await sleep(5)
        await madeRequest([[3, "testInjectionMethod7", []]])

        api.testEvent.fireForConnection(18, "123")
        api.testEvent.fireForConnection(17, lastConnectionId)
        result = await pollingResult
        expect(result.length).toEqual(1)
        expect(result[0][2]).toEqual(17)

        api.testEvent.fireForGroup(21, "123")
        api.testEvent.fireForGroup(22, "manager")

        result = await madeRequest([[5, "_.polling", []]])
        expect(result.length).toEqual(1)
        expect(result[0][2]).toEqual(22)

        api.testEvent.fireForSession(23, "123")
        api.testEvent.fireForSession(24, lastSessionId)

        result = await madeRequest([[5, "_.polling", []]])
        expect(result.length).toEqual(1)
        expect(result[0][2]).toEqual(24)

        api.testEvent.fire(25)

        result = await madeRequest([[5, "_.polling", []]])
        expect(result.length).toEqual(1)
        expect(result[0][2]).toEqual(25)

        await madeRequest([[2, "_.unsub", {
            event: "testEvent"
        }]])

        api.broadCastEvent.fire(123)
        api.testEvent.fire(25)
        result = await madeRequest([[5, "_.polling", []]])

        expect(result.length).toEqual(1)
        expect(result[0][0] === "ev").toBeTruthy()
        expect(result[0][1]).toEqual("broadCastEvent")
        expect(result[0][2]).toEqual(123)

        result = await madeRequest([[5, "_.someMethod", []]])
        expect(result[0][0] === "er").toBeTruthy()
        expect(result[0][2]).toEqual("RequestError")

    })

    it("connection index", async () => {
        (apiHttpServer as any).connectionIdIndex = Number.MAX_SAFE_INTEGER
        await madeRequest([[2, "someMethod"]])
        expect((apiHttpServer as any).connectionIdIndex).toEqual(1)
    })

    it("drop connection", async () => {
        recreateHttpServer({
            connectionLifetime: 5,
            checkConnectionsInterval: 5,
            pollingWaitTime: 5
        })
        await madeRequest([[1, "someMethod"]])
        let cId = lastConnectionId
        let resultPromise = madeRequest([[5, "_.polling"]])


        await sleep(20)
        let result = await resultPromise
        await madeRequest([[1, "someMethod"]])
        expect(result.length).toEqual(0)

        expect(cId === lastConnectionId).toBeFalsy()

        result = await madeRequest([[5, "_.polling"]])
        expect(result.length).toEqual(0)
    })

    it("custom json", async () => {
        recreateHttpServer({
            jsonEncoder: {
                parse: (data: string) => JSON.parse(data),
                stringify: (data: any) => "[]"
            }
        })
        let result = await madeRequest([[1, "someMethod"]])
        expect(result.length).toEqual(0)
    })

    it("custom session provider", () => {
        const provider = new MemorySessionProvider
        recreateHttpServer({
            sessionProvider: provider
        })
        expect((apiHttpServer as any).sessionProvider).toEqual(provider)
    })

    it("custom session id key", async () => {
        recreateHttpServer({
            sessionIdKey: "oops"
        })
        await madeRequest([[1, "someMethod"]])
        expect(response.headers['set-cookie']![0].indexOf("oops") !== -1).toBeTruthy()
    })

    it("custom object proxy", () => {
        const proxy = new ObjectProxy
        recreateHttpServer({
            objectProxy: proxy
        })
        expect((apiHttpServer as any).objectProxy).toEqual(proxy)
    })

    it("max message length", async () => {
        recreateHttpServer({
            maxMessageLength: 3
        })
        await expect(madeRequest([[1, "someMethod"]])).rejects.toThrow()
    })

    it("custom connection id key", async () => {
        recreateHttpServer({
            connectionIdKey: "myKey"
        })
        await madeRequest([[1, "someMethod", []]])
        let connectionId = lastConnectionId
        let result = await madeRequest([[2, "testInjectionMethod6x", []]], { 'cookie': `typedapi.sid=${lastSessionId};myKey=${lastConnectionId};` })
        expect((result[0][2] as any).connectionId).toEqual(connectionId)
    })

    it("server metadata", async () => {
        recreateHttpServer({
            serverMetadata: {
                name: "My server",
                version: "1"
            }
        })
        await madeRequest([[1, "someMethod", []]])
        let result = await madeRequest([[2, "_.v"], [3, "_.meta"]])
        expect(result.length).toEqual(2)
        expect(result[0][2]).toEqual("1")
        expect((result[1][2] as any).broadcastEvents.length).toEqual(1)
        expect((result[1][2] as any).broadcastEvents[0]).toEqual("broadCastEvent")
    })

    const sendOptions = (): Promise<number> => {
        return new Promise<number>((resolve, reject) => {
            request(`http://localhost:8080/`, {
                method: "OPTIONS",
            }, (requestErr, requestResponse, responseBody) => {
                if (requestErr) {
                    return reject(requestErr)
                }
                resolve(requestResponse.statusCode)
            })
        })
    }

    it("CORS", async () => {
        const code = await sendOptions()
        expect(code).toEqual(204)
    })

})