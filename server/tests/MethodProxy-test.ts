import { MethodProxy } from "../src/MethodProxy"
import { Reflection } from "./utils/Reflection"
import { Api, TestBooksApiError } from "./utils/Realization"
import { TestLogger } from "./utils/TestLogger"
import { ObjectProxy } from "../src/ObjectProxy"
import { buildMap } from "../src/buildMap"
import { NullLogger } from "../src"
import { ConnectionData } from "../src/auth"
import { NotAuthorizedError, ServerError, ServerMethodResponseMessage } from "typedapi-core"

type rec = Record<string, unknown>

const simpleAuthData: ConnectionData = {
    authData: {
        id: 1,
        groups: ["manager"]
    },
    ip: "ip",
    sessionId: "mySessionId"
}

describe("MethodProxyTest", () => {

    it("test1", async () => {
        let proxy = new MethodProxy({
            apiMap: buildMap(Reflection, new Api)
        })
        await proxy.callByClientMesssage([1, "books.create", [{
            title: "title",
            description: "description"
        }]], simpleAuthData)
        let result = await proxy.callByClientMesssage([2, "books.count", []], {
            authData: {},
            ip: "ip"
        })
        expect(result[0] === "r").toBeTruthy()
        expect(result[1]).toEqual(2)
        expect(result[2]).toEqual(1)
    })

    it("test errors", async () => {
        let logger = new TestLogger()
        let objectProxy = new ObjectProxy
        objectProxy.setErrors({ TestBooksApiError })
        let proxy = new MethodProxy({
            apiMap: buildMap(Reflection, new Api)
        })

        await expect(proxy.callByClientMesssage([2, "no_method", []], simpleAuthData)).rejects.toThrow()

        await expect(proxy.callByClientMesssage([2, "errorMethod", []], simpleAuthData)).rejects.toThrow()

        await expect(proxy.callByClientMesssage([2, "serverErrorMethod", []], simpleAuthData)).rejects.toThrow()

        await expect(proxy.callByClientMesssage([2, "books.create", [{
            title: "title",
            description: "description"
        }]], {
            authData: {
                id: 1,
                groups: ["some group"]
            },
            ip: "ip"
        })).rejects.toThrow()

        await expect(proxy.callByClientMesssage([2, "books.create", [{}]], simpleAuthData)).rejects.toThrow()

        await expect(proxy.callByClientMesssage([2, "books.create", [{
            title: "title",
            description: "description",
            asd: 123
        }]], simpleAuthData)).rejects.toThrow()

    })

    it("injections", async () => {

        let proxy = new MethodProxy({
            apiMap: buildMap(Reflection, new Api)
        })
        let res: ServerMethodResponseMessage | undefined

        res = await proxy.callByClientMesssage([2, "testInjectionMethod", []], simpleAuthData)
        expect(res[0] === "r").toBeTruthy()
        expect((res[2] as rec)).toEqual(1)

        res = await proxy.callByClientMesssage([2, "testInjectionMethod2", [2]], simpleAuthData)
        expect(res[0] === "r").toBeTruthy()
        expect((res[2] as rec).a).toEqual(2)
        expect((res[2] as rec).apiUserId).toEqual(1)

        res = await proxy.callByClientMesssage([2, "testInjectionMethod3", []], simpleAuthData)
        expect(res[0] === "r").toBeTruthy()
        expect((res[2] as rec).a).toBeUndefined()
        expect((res[2] as rec).apiUserId).toEqual(1)

        res = await proxy.callByClientMesssage([2, "testInjectionMethod4", [5, 6, 7]], simpleAuthData)
        expect(res[0] === "r").toBeTruthy()
        expect((res[2] as rec).a).toEqual(5)
        expect((res[2] as rec).b).toEqual(6)
        expect((res[2] as rec).c).toEqual(7)
        expect((res[2] as rec).apiUserId).toEqual(1)

        res = undefined
        try {
            res = await proxy.callByClientMesssage([2, "testInjectionMethod4", [5, 6, 7]], {
                authData: {},
                ip: ""
            })
        } catch (err) {
            expect(err).toBeInstanceOf(NotAuthorizedError)
        }
        expect(res).toBeUndefined()

        try {
            res = await proxy.callByClientMesssage([2, "testInjectionMethod5", []], simpleAuthData)
        } catch (err) {
            expect(err).toBeInstanceOf(ServerError)
        }
        expect(res).toBeUndefined()

        res = await proxy.callByClientMesssage([2, "testInjectionMethod6", []], simpleAuthData)
        expect(res[0] === "r").toBeTruthy()
        expect((res[2] as rec).apiUserId).toEqual(1)
        expect((res[2] as Record<string,Record<string,unknown>>).apiAuthData.id).toEqual(1)
        expect((res[2] as Record<string,Record<string,unknown>>).apiConnectionData.sessionId).toEqual("mySessionId")

        res = await proxy.callByClientMesssage([2, "testInjectionMethod7", []], simpleAuthData)
        expect(res[0] === "r").toBeTruthy()
        expect((res[2] as Record<string,Record<string,unknown>>).newAuthData.id).toEqual(123)

        res = await proxy.callByClientMesssage([2, "testInjectionMethod8", []], simpleAuthData)
        expect(res[0] === "r").toBeTruthy()
        expect((res[2] as rec).a).toBeUndefined()
        expect((res[2] as rec).apiUserId).toEqual(1)

    })

    it("some method", async () => {
        let proxy = new MethodProxy({
            apiMap: buildMap(Reflection, new Api)
        })
        let result = await proxy.callByClientMesssage([1, "someMethod", []], simpleAuthData)
        expect(result[2]).toBeUndefined()
    })

    it("filter config", async () => {
        let proxy: MethodProxy
        let result: ServerMethodResponseMessage

        proxy = new MethodProxy({
            apiMap: buildMap(Reflection, new Api)
        })

        result = await proxy.callByClientMesssage([1, "fullFilter", []], simpleAuthData)
        expect((result[2] as rec[])[0]).toEqual("1")
        expect((result[2] as rec[])[1]).toEqual(1)
        expect((result[2] as rec[])[2]).toEqual("2020-01-01T00:00:00.000Z")
        expect((result[2] as rec[])[3].a).toEqual("1")

        result = await proxy.callByClientMesssage([1, "fastFilter", []], simpleAuthData)
        expect((result[2] as rec[])[0]).toEqual("1")
        expect((result[2] as rec[])[1]).toEqual(1)
        expect((result[2] as rec[])[2]).toEqual("2020-01-01T00:00:00.000Z")
        expect((result[2] as rec[])[3].a).toEqual("1")

        result = await proxy.callByClientMesssage([1, "noFilter", []], simpleAuthData)
        expect((result[2] as rec[])[0]).toEqual("1")
        expect((result[2] as rec[])[1]).toEqual(1)
        expect((result[2] as Date[])[2].toISOString()).toEqual("2020-01-01T00:00:00.000Z")
        expect((result[2] as rec[])[3].a).toEqual("1")

        proxy = new MethodProxy({
            apiMap: buildMap(Reflection, new Api),
            fastFilter: true
        })

        result = await proxy.callByClientMesssage([1, "fullFilter", []], simpleAuthData)
        expect((result[2] as rec[])[0]).toEqual("1")
        expect((result[2] as rec[])[1]).toEqual(1)
        expect((result[2] as rec[])[2]).toEqual("2020-01-01T00:00:00.000Z")
        expect((result[2] as rec[])[3].a).toEqual("1")

        proxy = new MethodProxy({
            apiMap: buildMap(Reflection, new Api),
            noFilter: true
        })

        result = await proxy.callByClientMesssage([1, "fullFilter", []], simpleAuthData)
        expect((result[2] as rec[])[0]).toEqual("1")
        expect((result[2] as rec[])[1]).toEqual(1)
        expect((result[2] as Date[])[2].toISOString()).toEqual("2020-01-01T00:00:00.000Z")
        expect((result[2] as rec[])[3].a).toEqual("1")
    })

})