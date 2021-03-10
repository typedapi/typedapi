import { buildMap, ApiMap, TextLogger } from "typedapi-server"
import { Api, TestBooksApiError } from "./utils/Realization"
import { Reflection } from "./utils/Reflection"
import { TestBench, sleep, waitFor } from "./utils/helpers"
import { MemorySessionProvider } from "typedapi-server"
import { WebSocketServerConfig } from "../src/WebSocketServer"
import * as http from "http"
import { server as WsServer } from "websocket"
import { } from "typedapi-core"
import { ObjectProxy, LoggerInterface } from "typedapi-server"

describe("All tests", () => {

    let bench: TestBench

    let newBench = async (apiMap: ApiMap, cfg?: Partial<WebSocketServerConfig>, disableLogger: boolean = false) => {
        if (bench) {
            await bench.destroy()
        }
        bench = new TestBench(apiMap, cfg, disableLogger)
    }

    afterEach(async () => {
        bench && await bench.destroy()
    })

    it("connection", async () => {
        let api = new Api
        let apiMap = buildMap(Reflection, api as unknown as Record<string, unknown>)
        await newBench(apiMap, {
            jsonEncoder: {
                parse: d => JSON.parse(d),
                stringify: d => JSON.stringify(d)
            },
            objectProxy: new ObjectProxy
        })
        await bench.connect()
        await api.books.create({
            description: "",
            title: ""
        })
        let message = await bench.sendAndWaitForMessage([50, "books.count"])
        expect(message[0]).toEqual("r")
        expect(message[1]).toEqual(50)
        expect(message[2]).toEqual(1)
    })

    it("request validator", async () => {

        let api = new Api
        let apiMap = buildMap(Reflection, api as unknown as Record<string, unknown>)
        await newBench(apiMap, {
            requestValidator: () => Promise.resolve(false)
        })

        await expect(bench.connect()).rejects.toThrow()

        await newBench(apiMap, {
            requestValidator: () => Promise.resolve(true)
        })

        await bench.connect()

        await newBench(apiMap, {
            requestValidator: () => Promise.reject()
        })

        await expect(bench.connect()).rejects.toThrow()

    })

    it("session id", async () => {

        let api = new Api
        let apiMap = buildMap(Reflection, api as unknown as Record<string, unknown>)
        let sessionProvider = new MemorySessionProvider()

        await newBench(apiMap, {
            sessionIdKey: "test",
            sessionProvider,
        })

        await bench.connect()
        await sleep(5)
        let message = bench.getLastMessage()
        expect(message[1]).toHaveProperty("setSessionId")
        let sessionId = message.setSessionId

        await newBench(apiMap, {
            sessionIdKey: "test",
            sessionProvider,
        })
        await bench.connect({
            cookie: `test=${sessionId};a=b`
        })
        await expect(bench.waitForMessage()).rejects.toThrow()

        await newBench(apiMap, {
            sessionIdKey: "test",
            sessionProvider,
        })
        await bench.connect({
            cookie: `test=asd;a=b`
        })
        await sleep(5)
        message = bench.getLastMessage()
        expect(message[1]).toHaveProperty("setSessionId")
        const lastSessionId = message[1].setSessionId

        await bench.connect({
            cookie: `test=${lastSessionId};a=b`
        })
        await sleep(5)
        message = bench.getLastMessage()
        expect(message[1].setSessionId).toEqual(lastSessionId)

    })

    it("custom ws server", async () => {

        let api = new Api
        let apiMap = buildMap(Reflection, api as unknown as Record<string, unknown>)

        let httpServer = http.createServer()
        httpServer.listen(8080)
        let wsServer = new WsServer({
            httpServer: httpServer,
        })
        await newBench(apiMap, {
            wsServer,
        })
        await bench.connect()
        await api.books.create({
            description: "",
            title: ""
        })
        let message = await bench.sendAndWaitForMessage([50, "books.count"])
        expect(message[0]).toEqual("r")
        expect(message[2]).toEqual(1)
        await bench.destroy()
        await (new Promise<void>((resolve, reject) => {
            httpServer.close(err => {
                if (err) {
                    return reject(err)
                }
                resolve()
            })
        }))

    })

    it("wrong data", async () => {
        let api = new Api
        let apiMap = buildMap(Reflection, api as unknown as Record<string, unknown>)
        await newBench(apiMap)
        await bench.connect()
        await bench.sendBytes(Buffer.alloc(1))
        await waitFor(() => !bench.isConnected(), "should disconnect")

        await newBench(apiMap)
        await bench.connect()
        await bench.sendString("{{")
        await waitFor(() => !bench.isConnected(), "should disconnect")

        await newBench(apiMap)
        await bench.connect()
        await bench.send({ a: 10 })
        await waitFor(() => !bench.isConnected(), "should disconnect")

        await newBench(apiMap, {
            maxMessageLength: 10
        })
        await bench.connect()
        await bench.send([50, "books.count"])
        await waitFor(() => !bench.isConnected(), "should disconnect")
    })

    it("logger", async () => {
        let api = new Api
        let apiMap = buildMap(Reflection, api as unknown as Record<string, unknown>)
        await newBench(apiMap, {}, true)
        expect((bench.wsServer as any).logger.logFunction).toEqual(console.log)

        let lastLog = ""
        let lastErrorLog = ""
        await newBench(apiMap, {
            logger: new TextLogger(l => lastLog = l, l => lastErrorLog = l)
        })
    })

    it("errors handling", async () => {
        let api = new Api
        let apiMap = buildMap(Reflection, api as unknown as Record<string, unknown>)
        let objectProxy = new ObjectProxy
        objectProxy.setErrors({
            TestBooksApiError
        })
        await newBench(apiMap, {
            objectProxy,
        })
        await bench.connect()
        /*let result = await bench.sendAndWaitForMessage([1,"errorMethod",[]])
        expect(result[0]).toEqual("er")
        expect(result[2]).toEqual("TestBooksApiError")

        result = await bench.sendAndWaitForMessage([1,"serverErrorMethod",[]])
        expect(result[0]).toEqual("er")
        expect(result[2]).toEqual("ServerError")*/

        let result = await bench.sendAndWaitForMessage([1, "_.sub"])
        expect(result[0]).toEqual("er")
        expect(result[2]).toEqual("RequestError")

        result = await bench.sendAndWaitForMessage([1, "_.sub", { event: "no_exists_event" }])
        expect(result[0]).toEqual("er")
        expect(result[2]).toEqual("RequestError")

        result = await bench.sendAndWaitForMessage([1, "_.unsub", { event: "no_exists_event" }])
        expect(result[0]).toEqual("er")
        expect(result[2]).toEqual("RequestError")

        result = await bench.sendAndWaitForMessage([1, "_.unsub"])
        expect(result[0]).toEqual("er")
        expect(result[2]).toEqual("RequestError")

        result = await bench.sendAndWaitForMessage([1, "_.unsub", { event: "testParametricEvent" }])
        expect(result[0]).toEqual("er")
        expect(result[2]).toEqual("RequestError")

        result = await bench.sendAndWaitForMessage([1, "_.noExistMethod", {}])
        expect(result[0]).toEqual("er")
        expect(result[2]).toEqual("RequestError")

        result = await bench.sendAndWaitForMessage([1, "testInjectionMethod2", [1]])
        expect(result[0]).toEqual("er")
        expect(result[2]).toEqual("ServerError")

    })

    it("events", async () => {
        let api = new Api
        let apiMap = buildMap(Reflection, api as unknown as Record<string, unknown>)
        await newBench(apiMap, {
        })
        await bench.connect()
        let result = await bench.sendAndWaitForMessage([1, "_.sub", { event: "testEvent" }])
        let eventMessagePromise = bench.waitForMessage()
        api.testEvent.fire(1)

        result = await eventMessagePromise
        expect(result[1]).toEqual("testEvent")
        expect(result[2]).toEqual(1)
        result = await bench.sendAndWaitForMessage([1, "_.unsub", { event: "testEvent" }])
        expect(result[0]).toEqual("r")
        result = await bench.sendAndWaitForMessage([1, "_.sub", {
            event: "testParametricEvent",
            parameters: 1
        }])
        expect(result[0]).toEqual("r")
        let subscriptionId = result[1]

        eventMessagePromise = bench.waitForMessage()
        api.testParametricEvent.fire(2, 1)
        result = await eventMessagePromise

        expect(result[1]).toEqual("testParametricEvent")
        expect(result[2]).toEqual(2)
        expect(result[3]).toEqual(subscriptionId)
        result = await bench.sendAndWaitForMessage([1, "_.unsub", {
            event: "testParametricEvent",
            subscriptionId: subscriptionId
        }])
        expect(result[0]).toEqual("r")

        api.broadCastEvent.fire(123)
        await sleep(1)
        let lastMessage = bench.getLastMessage()
        expect(lastMessage[1]).toEqual("broadCastEvent")
        expect(lastMessage[2]).toEqual(123)
    })

    it("auth", async () => {
        let api = new Api
        let apiMap = buildMap(Reflection, api as unknown as Record<string, unknown>)
        await newBench(apiMap, {
            //logger: new TextLogger(console.log, console.error),
        })
        await bench.connect()

        let result = await bench.sendAndWaitForMessage([1, "testInjectionMethod7"])
        expect(result[0]).toEqual("r")
        expect(result[2]).toEqual(true)

        result = await bench.sendAndWaitForMessage([1, "testInjectionMethod6"])
        expect(result[0]).toEqual("r")
        expect(result[2].apiUserId).toEqual("new-id")

        result = await bench.sendAndWaitForMessage([1, "logout"])
        expect(result[0]).toEqual("r")

        result = await bench.sendAndWaitForMessage([1, "testInjectionMethod6"])
        expect(result[0]).toEqual("er")

    })

    it("fake injection return", async () => {
        let api = new Api
        let apiMap = buildMap(Reflection, api as unknown as Record<string, unknown>)
        await newBench(apiMap)
        await bench.connect()

        await bench.sendAndWaitForMessage([1, "testInjectionMethod7"])

        let result = await bench.sendAndWaitForMessage([1, "testInjectionMethod5x"])
        expect(result[0]).toEqual("er")
    })

    it("Handle connection error", async () => {

        const logger: LoggerInterface = {
            methodCall: () => { "" },
            clientError: () => { "" },
            serverError: () => { "" },
            event: (event) => { if (event === "online") throw new Error("") },
            status: () => { "" },
        }

        let apiMap = buildMap(Reflection, (new Api) as unknown as Record<string, unknown>)

        await newBench(apiMap, {
            logger: logger
        })

        await bench.connect()
        await sleep(5)

        expect(bench.isConnected()).toBeFalsy()

    })

    it("events2", async () => {

        const api = new Api
        let apiMap = buildMap(Reflection, api as unknown as Record<string, unknown>)
        await newBench(apiMap)
        await bench.connect()

        await bench.sendAndWaitForMessage([3, "testInjectionMethod7"])
        await bench.sendAndWaitForMessage([1, "someMethod"])
        let result = await bench.sendAndWaitForMessage([2, "_.sub", {
            event: "testEvent"
        }])
        expect(result[2]).toBeUndefined()

        await bench.sendAndWaitForMessage([3, "testInjectionMethod7"])
        let promiseResult = bench.waitForMessage()

        api.testEvent.fireForUser(1, 'new-id')

        result = await promiseResult

        expect(result[0]).toEqual("ev")
        expect(result[1]).toEqual("testEvent")
        expect(result[2]).toEqual(1)
        promiseResult = bench.waitForMessage()
        api.testEvent.fireForUser(1, 111)
        await expect(promiseResult).rejects.toThrow()

        await newBench(apiMap)
        await bench.connect()

        await bench.sendAndWaitForMessage([2, "_.sub", {
            event: "testEvent"
        }])

        await sleep(5)
        await bench.sendAndWaitForMessage([3, "testInjectionMethod7"])
        promiseResult = bench.waitForMessage()
        let connectionId: string = ""
        bench.wsServer.getConnections().forEach(connection => {
            connectionId = connection.connectionId!
        })
        api.testEvent.fireForConnection(17, connectionId)
        result = await promiseResult
        expect(result[2]).toEqual(17)

        promiseResult = bench.waitForMessage()
        api.testEvent.fireForConnection(18, "123")
        await expect(promiseResult).rejects.toThrow()

        promiseResult = bench.waitForMessage()
        api.testEvent.fireForGroup(22, "manager")
        result = await promiseResult
        expect(result[2]).toEqual(22)

        promiseResult = bench.waitForMessage()
        api.testEvent.fireForGroup(21, "123")
        await expect(promiseResult).rejects.toThrow()

        let sessionId: string = ""
        bench.wsServer.getConnections().forEach(connection => {
            sessionId = connection.sessionId!
        })

        promiseResult = bench.waitForMessage()
        api.testEvent.fireForSession(24, sessionId)
        result = await promiseResult
        expect(result[2]).toEqual(24)

        promiseResult = bench.waitForMessage()
        api.testEvent.fireForSession(23, "123")
        await expect(promiseResult).rejects.toThrow()

        promiseResult = bench.waitForMessage()
        api.testEvent.fire(25)
        result = await promiseResult
        expect(result[2]).toEqual(25)

        await bench.sendAndWaitForMessage([2, "_.unsub", {
            event: "testEvent"
        }])

        promiseResult = bench.waitForMessage()
        api.testEvent.fire(25)
        await expect(promiseResult).rejects.toThrow()

        promiseResult = bench.waitForMessage()
        api.broadCastEvent.fire(123)
        result = await promiseResult
        expect(result[2]).toEqual(123)

        result = await bench.sendAndWaitForMessage([5, "_.someMethod"])
        expect(result[0] === "er").toBeTruthy()
        expect(result[2]).toEqual("RequestError")

    })

    it("log status", async () => {
        let api = new Api
        let apiMap = buildMap(Reflection, api as unknown as Record<string, unknown>)
        let lastLog = ""
        let lastErrorLog = ""
        await newBench(apiMap, {
            logger: new TextLogger(l => lastLog = l, l => lastErrorLog = l),
            logStatusInterval: 1000
        })
        await bench.connect()
        await sleep(2500)
        expect(lastLog).toMatch(/Users online: 1; Usage: cpu [0-9\.]+%, mem [0-9\.]+%, drive [0-9\.]+%/)
    })


})