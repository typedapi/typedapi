import { EventsProxy, EventsProxyOnSendData } from "../src/EventsProxy"
import { buildMap } from "../src/buildMap"
import { Reflection } from "./utils/Reflection"
import { Api } from "./utils/Realization"
import { AuthData, ConnectionData } from "../src/auth"

const simpleAuthData: AuthData = {
    id: 1,
    groups: ["manager"]
}

type rec<T = unknown> = Record<string, T>

describe("EventsProxy", () => {

    it("simple events", async () => {

        let api = new Api
        let proxy = new EventsProxy(buildMap(Reflection, api))

        expect(proxy.hasEvent("books.onCreate")).toBeTruthy()
        expect(proxy.hasEvent("books.onCreate1")).toBeFalsy()

        expect(proxy.hasParametricEvent("books.onBookUpdated")).toBeTruthy()
        expect(proxy.hasParametricEvent("books.onBookUpdated1")).toBeFalsy()

        await proxy.unsubscribeFromEvent("books.onCreate", "123")

        let eventData: EventsProxyOnSendData | undefined

        api.testEvent.fire(1)

        proxy.onSend.subscribe((data) => {
            eventData = data
        })

        api.books.onCreate.fireForUser({ description: "1", "id": 2, title: "asd" }, "123")
        expect((eventData!.data[2] as rec).description).toEqual("1")
        expect(eventData!.meta![1]).toEqual("123")

        await proxy.subscribeToEvent("books.onCreate", "123")
        let newBook = await api.books.create({
            title: "title",
            description: "description"
        })
        expect(eventData!.data[1]).toEqual("books.onCreate")
        expect((eventData!.data[2] as rec).id).toEqual(newBook.id)
        expect((eventData!.data[2] as rec).title).toEqual(newBook.title)
        expect((eventData!.data[2] as rec).description).toEqual(newBook.description)

        proxy.subscribeToEvent("books.onCreate", "1234")

        await proxy.unsubscribeFromEvent("books.onCreate", "123")

        await api.callBroadcastEvent(123)
        expect(eventData!.data[1]).toEqual("broadCastEvent")
        expect(eventData!.data[2]).toEqual(123)

        api.broadCastEvent.fireForUser(1234, "123")
        expect(eventData!.data[1]).toEqual("broadCastEvent")
        expect(eventData!.data[2]).toEqual(1234)
        expect(eventData!.meta![1]).toEqual("123")

        await proxy.subscribeToEvent("broadCastEvent", "123")

        api.testEvent.fireForUser(1, 1)
        expect(eventData!.meta![1]).toEqual(1)
        api.testEvent.fireForUser(2, 2)
        expect(eventData!.meta![1]).toEqual(2)
        api.testEvent.fireForGroup(2, "manager")
        expect(eventData!.meta![1]).toEqual("manager")
        api.testEvent.fireForGroup(3, "manager2")
        expect(eventData!.meta![1]).toEqual("manager2")

        api.testEvent.fireForConnection(3, "conn2")
        expect(eventData!.meta![0]).toEqual("c")
        expect(eventData!.meta![1]).toEqual("conn2")

        api.testEvent.fireForSession(100, "some-session")
        expect(eventData!.meta![1]).toEqual("some-session")
        api.testEvent.fireForSession(100, "test-session-id")
        expect(eventData!.meta![1]).toEqual("test-session-id")

        expect(proxy.getSubscriptions("books.onCreate")?.size).toEqual(1)

        proxy.dropConnection("123")

        proxy.destroy()

    })

    it("rejects noExistsEvent", async () => {

        let api = new Api
        let proxy = new EventsProxy(buildMap(Reflection, api))

        try {
            await proxy.subscribeToEvent("noExistsEvent", "123")
            throw new Error("should reject")
        } catch (err) {
            expect(err.message).toMatch("Event noExistsEvent not found")
        }

    })

    it("parametric events", async () => {
        let api = new Api
        let proxy = new EventsProxy(buildMap(Reflection, api))

        await proxy.unsubscribeFromParametricEvent("books.onBookUpdated", "123", 1)
        api.testParametricEvent.fire(1, 1)

        let eventData: any = null

        proxy.onSend.subscribe(data => {
            eventData = data
        })

        let book = await api.books.create({
            title: "title",
            description: "description"
        })

        await expect(proxy.subscribeToParametricEvent("noExistsEvent", book.id, "123", simpleAuthData)).rejects.toThrow("Event noExistsEvent not found")

        let subscriptionId = await proxy.subscribeToParametricEvent("books.onBookUpdated", book.id, "123", simpleAuthData)
        await proxy.subscribeToParametricEvent("books.onBookUpdated", 123, "123", simpleAuthData)

        await api.books.update(book.id, {
            title: "title2"
        })

        expect(eventData.data[2].id).toEqual(book.id)
        expect(eventData.data[2].title).toEqual("title2")
        expect(eventData.data[3]).toEqual(subscriptionId)

        await expect(proxy.subscribeToParametricEvent("books.onBookUpdated", 100, "123", simpleAuthData)).rejects.toThrow()


        await proxy.unsubscribeFromParametricEvent("books.onBookUpdated", "123", subscriptionId);
        await proxy.unsubscribeFromParametricEvent("books.onBookUpdated", "1234", 1);

        (proxy as any).parametricSubscriptionIndex = Number.MAX_SAFE_INTEGER

        let subscribeResponse = await proxy.subscribeToParametricEvent("books.onBookUpdated", 1, "123", simpleAuthData)
        proxy.dropConnection("123")

        await proxy.subscribeToParametricEvent("testParametricEvent", 1, "123", simpleAuthData)

        await expect(proxy.subscribeToParametricEvent("books.onBookUpdated", { a: 10 }, "123", simpleAuthData)).rejects.toThrow()

    })

    it("subsctibe from request", async () => {
        let connectionData: ConnectionData = {
            ip: "",
            authData: {},
            connectionId: "1"
        }
        let api = new Api
        let proxy = new EventsProxy(buildMap(Reflection, api))
        await expect(proxy.subscribeToEventFromRequest([1, "_.sub", { a: 1 }], connectionData)).rejects.toThrow()
        let result = await proxy.subscribeToEventFromRequest([1, "_.sub", { event: "testParametricEvent", parameters: 1 }], connectionData)
        await expect(proxy.subscribeToEventFromRequest([1, "_.sub", { event: "noExistsEvent", parameters: 1 }], connectionData)).rejects.toThrow()
        await proxy.subscribeToEventFromRequest([1, "_.unsub", { event: "testParametricEvent", subscriptionId: result[2] }], connectionData)
        await expect(proxy.subscribeToEventFromRequest([1, "_.unsub", { a: 1 }], connectionData)).rejects.toThrow()
        await expect(proxy.subscribeToEventFromRequest([1, "_.unsub", { event: "testParametricEvent" }], connectionData)).rejects.toThrow()
        await expect(proxy.subscribeToEventFromRequest([1, "_.unsub", { event: "noExistsEvent", subscriptionId: result[2] }], connectionData)).rejects.toThrow()
        await expect(proxy.subscribeToEventFromRequest([1, "noExistsEvent", { a: 1 }], connectionData)).rejects.toThrow()
        await expect(proxy.subscribeToEventFromRequest([1, "_.sub", { event: "testParametricEvent", parameters: 1 }], {
            ip: "",
            authData: {}
        })).rejects.toThrow()
    })

})