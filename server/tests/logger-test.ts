import { NullLogger, TextLogger } from "../src/log"

describe("log test", () => {

    const rmd = (s: string) => s.replace(/^.*\Z: /, "")

    it("TextLogger test", () => {

        let logString = ""
        let errorLogString = ""
        let logger = new TextLogger(s => logString = s, s => errorLogString = s)

        logger.methodCall("a", 100, { input: 1 }, { ouput: 2 }, { authData: {}, ip: "123", sessionId: "123" })
        expect(rmd(logString)).toEqual("a, 100ms, 123, anonymous, input: {\"input\":1}, output: {\"ouput\":2}")
        logger.methodCall("a", 100, { input: 1 }, { ouput: 2 }, { authData: { id: 123 }, ip: "123", sessionId: "123" })
        expect(rmd(logString)).toEqual("a, 100ms, 123, user 123, input: {\"input\":1}, output: {\"ouput\":2}")
        logger.methodCall("a", 100, null, null, { authData: { id: 123 }, ip: "123", sessionId: "123" })
        expect(rmd(logString)).toEqual("a, 100ms, 123, user 123")

        logger.clientError("a", { input: 1 }, "error text", { authData: { id: 123 }, ip: "123", sessionId: "123" })
        expect(rmd(errorLogString)).toEqual("Client error a, 123, user 123, input: {\"input\":1}, Error: error text")

        logger.clientError("a", undefined, "error text", { authData: {}, ip: "123", sessionId: "123" })
        expect(rmd(errorLogString)).toEqual("Client error a, 123, anonymous, Error: error text")

        logger.serverError("a", { input: 1 }, "error text", { authData: { id: 123 }, ip: "123", sessionId: "123" })
        expect(rmd(errorLogString)).toEqual("Server error a, 123, user 123, input: {\"input\":1}, Error: error text")

        logger.serverError("a", null, "error text", { authData: {}, ip: "123", sessionId: "123" })
        expect(rmd(errorLogString)).toEqual("Server error a, 123, anonymous, Error: error text")

        logger.login({ ip: "ip", authData: { id: 1 } })
        expect(rmd(logString)).toEqual("login user 1, ip")

        logger.logout({ ip: "ip", authData: { id: 1 } })
        expect(rmd(logString)).toEqual("logout user 1, ip")

        logger.online({ ip: "ip", authData: { id: 1 } })
        expect(rmd(logString)).toEqual("online user 1, ip")

        logger.online({ ip: "ip", authData: {} })
        expect(rmd(logString)).toEqual("online user anonymous, ip")

        logger.offline({ ip: "ip", authData: { id: 1 } })
        expect(rmd(logString)).toEqual("offline user 1, ip")

        logger.offline({ ip: "ip", authData: {} })
        expect(rmd(logString)).toEqual("offline user anonymous, ip")

        logger.event("event", { a: 1 })
        expect(rmd(logString)).toEqual("event event {\"a\":1}")

        logger.event("event", null)
        expect(rmd(logString)).toEqual("event event")

    })

    it("NullLoggerTest", () => {
        let logger = new NullLogger()
        logger.methodCall()
        logger.clientError()
        logger.serverError()
        logger.login()
        logger.logout()
        logger.online()
        logger.offline()
        logger.event()
    })

})
