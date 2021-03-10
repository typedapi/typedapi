import { NullLogger, TextLogger } from "../src/log"
import { getUsageStatus } from "../src/getUsageStatus"

describe("log test", () => {

    const rmd = (s: string) => s.replace(/^\[.*\Z\]: /, "")

    it("TextLogger test", () => {

        let logString = ""
        let errorLogString = ""
        let logger = new TextLogger(s => logString = s, s => errorLogString = s)

        logger.methodCall("a", 100, { input: 1 }, { ouput: 2 }, { authData: {}, ip: "123", sessionId: "123" })
        expect(rmd(logString)).toEqual("a, 100ms, anon ip:123 sid:123, input: {\"input\":1}, output: {\"ouput\":2}")
        logger.methodCall("a", 100, { input: 1 }, { ouput: 2 }, { authData: { id: 123 }, ip: "123", sessionId: "123" })
        expect(rmd(logString)).toEqual("a, 100ms, id:123 ip:123 sid:123, input: {\"input\":1}, output: {\"ouput\":2}")
        logger.methodCall("a", 100, null, null, { authData: { id: 123 }, ip: "123", sessionId: "123" })
        expect(rmd(logString)).toEqual("a, 100ms, id:123 ip:123 sid:123")

        logger.clientError("a", { input: 1 }, "error text", { authData: { id: 123 }, ip: "123", sessionId: "123" })
        expect(rmd(errorLogString)).toEqual("Client error a, id:123 ip:123 sid:123, input: {\"input\":1}, Error: error text")

        logger.clientError("a", undefined, "error text", { authData: {}, ip: "123", sessionId: "123" })
        expect(rmd(errorLogString)).toEqual("Client error a, anon ip:123 sid:123, Error: error text")

        logger.serverError("a", { input: 1 }, "error text", { authData: { id: 123 }, ip: "123", sessionId: "123" })
        expect(rmd(errorLogString)).toEqual("Server error a, id:123 ip:123 sid:123, input: {\"input\":1}, Error: error text")

        logger.serverError("a", null, "error text", { authData: {}, ip: "123", sessionId: "123" })
        expect(rmd(errorLogString)).toEqual("Server error a, anon ip:123 sid:123, Error: error text")

        logger.event("login", undefined, { ip: "ip", authData: { id: 1 } })
        expect(rmd(logString)).toEqual("login id:1 ip:ip")

        logger.event("logout", undefined, { ip: "ip", authData: { id: 1 } })
        expect(rmd(logString)).toEqual("logout id:1 ip:ip")

        logger.event("online", undefined, { ip: "ip", authData: { id: 1 } })
        expect(rmd(logString)).toEqual("online id:1 ip:ip")

        logger.event("online", undefined, { ip: "ip", authData: {} })
        expect(rmd(logString)).toEqual("online anon ip:ip")

        logger.event("offline", undefined, { ip: "ip", authData: { id: 1 } })
        expect(rmd(logString)).toEqual("offline id:1 ip:ip")

        logger.event("offline", undefined, { ip: "ip", authData: {} })
        expect(rmd(logString)).toEqual("offline anon ip:ip")

        logger.event("event", { a: 1 })
        expect(rmd(logString)).toEqual("event {\"a\":1}")

        logger.event("event", null)
        expect(rmd(logString)).toEqual("event")

    })

    it("log status", async () => {
        let logString = ""
        let errorLogString = ""
        let logger = new TextLogger(s => logString = s, s => errorLogString = s)
        logger.status({
            usersOnline: 10,
            usage: await getUsageStatus()
        })
        expect(rmd(logString)).toMatch(/Users online: 10; Usage: cpu [0-9\.]+%, mem [0-9\.]+%, drive [0-9\.]+%/)
    })

    it("NullLoggerTest", () => {
        let logger = new NullLogger()
        logger.methodCall()
        logger.clientError()
        logger.serverError()
        logger.event()
        logger.status()
    })

})
