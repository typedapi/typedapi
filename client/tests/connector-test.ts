import { TestTransport } from "./utils/TestTransport"
import { ObjectProxy, Connector } from "../src"
import { Reflection } from "./utils/Reflection"

describe("connector", () => {

    let clearCallbacks = (connector: Connector) => {
        (connector as any).callbacks.forEach((c: any) => c.resolve())
    }

    it("message", async () => {
        let transport = new TestTransport()
        let connector = new Connector({ transport, reflection: Reflection })
        //let apiClient = buildApiClient(Reflection, connector)
        let resultPromise = connector.callMethod("books.create", [{
            title: "title",
            description: "desc",
        }])

        transport.onMessage.fire(["r", 1000])

        let requestId = transport.getLastSent()[0]
        transport.onMessage.fire(["r", requestId, {
            id: 1,
            title: "title",
            description: "desc"
        }])
        let result = await resultPromise
        expect((result as any).title).toEqual("title")
        clearCallbacks(connector)

        expect(connector.getConnectionStatus()).toEqual("connected")
    })

    it("error", async () => {
        let transport = new TestTransport()
        let connector = new Connector({ transport, reflection: Reflection })

        let resultPromise = connector.callMethod("books.create", [{
            title: "title",
            description: "desc",
        }])
        let requestId = transport.getLastSent()[0]

        transport.onMessage.fire(["er", requestId, "ServerError", {
            message: "asd"
        }])
        await expect(resultPromise).rejects.toThrow("Server error. Please try again later.")

        /*transport.onMessage.fire({
            requestId: 512,
            success: true
        })*/
        clearCallbacks(connector)
    })

    it("unknown error", async () => {
        let transport = new TestTransport()
        let connector = new Connector({ transport, reflection: Reflection })

        let resultPromise = connector.callMethod("books.create", [{
            title: "title",
            description: "desc",
        }])
        let requestId = transport.getLastSent()[0]

        transport.onMessage.fire(["er", requestId, "ErrorCode", "ErrorData"])
        await expect(resultPromise).rejects.toThrow("ErrorData")
        clearCallbacks(connector)
    })

    it("event", async () => {
        let transport = new TestTransport()
        let connector = new Connector({ transport, reflection: Reflection })
        transport.onMessage.fire(["ev", "testEvent"])
        transport.onMessage.fire(["ev", "testParametricEvent", 1])
        let testEventCallsCount = 0
        let resultPromise = connector.subscribe("testEvent", () => testEventCallsCount++)
        transport.onMessage.fire(["r", transport.getLastSent()[0]])
        let subscription = await resultPromise
        let testParametricEventLastValue = 0
        resultPromise = connector.subscribeParametric("testParametricEvent", 1, v => testParametricEventLastValue = v as number)
        transport.onMessage.fire(["r", transport.getLastSent()[0], 1])
        let subscription2 = await resultPromise

        const subscription3 = await connector.subscribe("testEvent", () => { })

        transport.onMessage.fire(["ev", "testEvent"])
        transport.onMessage.fire(["ev", "testParametricEvent", 123, 1])
        expect(testEventCallsCount).toEqual(1)
        expect(testParametricEventLastValue).toEqual(123)

        subscription.unsubscribe()
        transport.onMessage.fire(["r", transport.getLastSent()[0]])
        subscription2.unsubscribe()
        transport.onMessage.fire(["r", transport.getLastSent()[0]])
        subscription3.unsubscribe()
        transport.onMessage.fire(["r", transport.getLastSent()[0]])

        transport.onMessage.fire(["ev", "testEvent"])
        transport.onMessage.fire(["ev", "testParametricEvent", 1234, 1])

        expect(testEventCallsCount).toEqual(1)
        expect(testParametricEventLastValue).toEqual(123)

        resultPromise = connector.subscribeParametric("testParametricEvent2", 1, v => testParametricEventLastValue = v as number)
        transport.onMessage.fire(["r", transport.getLastSent()[0], 1])
        let subscription4 = await resultPromise

        resultPromise = connector.subscribe("testEvent2", () => testEventCallsCount++)
        transport.onMessage.fire(["r", transport.getLastSent()[0]])
        let subscription5 = await resultPromise

        transport.onMessage.fire(["ev", "testEvent2"])
        transport.onMessage.fire(["ev", "testParametricEvent2", undefined, 1])

        expect(testEventCallsCount).toEqual(2)
        expect(testParametricEventLastValue).toBeUndefined()

        subscription4.unsubscribe()
        transport.onMessage.fire(["r", transport.getLastSent()[0]])
        subscription5.unsubscribe()
        transport.onMessage.fire(["r", transport.getLastSent()[0]])

    })

    it("connection status", async () => {
        let transport = new TestTransport()
        let connector = new Connector({ transport, reflection: Reflection })
        transport.connectionStatusChanged.fire("connected")
        expect(connector.getConnectionStatus()).toEqual("connected")
    })

    it("custom object proxy", async () => {
        let transport = new TestTransport()
        let objectProxy = new ObjectProxy
        let connector = new Connector({ transport, objectProxy, reflection: Reflection })
        let resultPromise = connector.callMethod("books.create", [{
            title: "title",
            description: "desc",
        }])
        transport.onMessage.fire(["er", transport.getLastSent()[0], "ServerError", "Server big error"])
        expect(resultPromise).rejects.toThrow("Server big error")
    })

    it("method with no return data", async () => {
        let transport = new TestTransport()
        let connector = new Connector({ transport, reflection: Reflection })
        let resultPromise = connector.callMethod("someMethod", [])
        transport.onMessage.fire(["r", transport.getLastSent()[0]])
        let result: any = await resultPromise
        expect(result).toBeUndefined()
    })

    it("optional params clip", async () => {
        let transport = new TestTransport()
        let connector = new Connector({ transport, reflection: Reflection })
        let resultPromise = connector.callMethod("someMethod1", ["123", 1])
        transport.onMessage.fire(["r", transport.getLastSent()[0]])
        await resultPromise
        expect(transport.getLastSent()[2].length).toEqual(2)
    })

    //someMethod

})