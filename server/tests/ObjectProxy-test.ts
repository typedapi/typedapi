import { ObjectProxy } from "../src/ObjectProxy"
import { ServerError, ClientError } from "typedapi-core"
import { NullLogger } from "../src"

class CustomError extends ClientError {
    constructor(message: string = "CustomError") {
        super(message)
        Object.setPrototypeOf(this, CustomError.prototype)
    }
}

describe("Object proxy", () => {

    it("codes", () => {
        let proxy = new ObjectProxy
        expect(proxy.getErrorClass("ServerError")).toEqual(ServerError)
        expect(proxy.getErrorClass("ClientError")).toEqual(ClientError)
        expect(proxy.getErrorCode(new ServerError)).toEqual("ServerError")
        expect(proxy.getErrorCode(new ClientError)).toEqual("ClientError")
        expect(proxy.getErrorCode(new CustomError)).toEqual("ServerError")
    })

    it("responseFromError", () => {
        let proxy = new ObjectProxy
        let response = proxy.responseFromError({
            err: new ServerError("custom error message"),
            connectionData: { authData: {}, ip: "" },
            requestId: 1
        })
        expect(response[0]).toEqual("er")
        expect(response[1]).toEqual(1)
        expect(response[2]).toEqual("ServerError")
        expect(response[3]).toEqual({})

        response = proxy.responseFromError({
            err: new ClientError("custom error message"),
            connectionData: { authData: {}, ip: "" },
            requestId: 1
        })
        expect(response[0]).toEqual("er")
        expect(response[1]).toEqual(1)
        expect(response[2]).toEqual("ClientError")
        expect(response[3]).toMatch("custom error message")

        response = proxy.responseFromError({
            err: new Error("custom error message"),
            connectionData: { authData: {}, ip: "" },
            requestId: 1
        })
        expect(response[0]).toEqual("er")
        expect(response[1]).toEqual(1)
        expect(response[2]).toEqual("ServerError")
        expect(response[3]).toEqual({})

        response = proxy.responseFromError({
            err: "",
            connectionData: { authData: {}, ip: "" },
            requestId: 1
        })
        expect(response[0]).toEqual("er")
        expect(response[1]).toEqual(1)
        expect(response[2]).toEqual("ServerError")
        expect(response[3]).toEqual({})

        let logger = new NullLogger

        response = proxy.responseFromError({
            err: new ServerError("custom error message"),
            connectionData: { authData: {}, ip: "" },
            requestId: 1,
            logger,
        })

        response = proxy.responseFromError({
            err: new ClientError("custom error message"),
            connectionData: { authData: {}, ip: "" },
            requestId: 1,
            logger,
        })

        response = proxy.responseFromError({
            err: new Error("custom error message"),
            connectionData: { authData: {}, ip: "" },
            requestId: 1,
            logger,
        })

        response = proxy.responseFromError({
            err: "",
            connectionData: { authData: {}, ip: "" },
            requestId: 1,
            logger,
        })

        //--------------------------------------

        response = proxy.responseFromError({
            err: new ServerError("custom error message"),
            connectionData: { authData: {}, ip: "" },
            requestId: 1,
            logger,
            method: "asd"
        })

        response = proxy.responseFromError({
            err: new ClientError("custom error message"),
            connectionData: { authData: {}, ip: "" },
            requestId: 1,
            logger,
            method: "asd"
        })

        response = proxy.responseFromError({
            err: new Error("custom error message"),
            connectionData: { authData: {}, ip: "" },
            requestId: 1,
            logger,
            method: "asd"
        })

        response = proxy.responseFromError({
            err: "",
            connectionData: { authData: {}, ip: "" },
            requestId: 1,
            logger,
            method: "asd"
        })        
    })
})