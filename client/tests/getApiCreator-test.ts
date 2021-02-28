import { getApiCreator } from "../src"
import { TestTransport } from "./utils/TestTransport"
import { ApiObjectReflection } from "typedapi-core"

interface TestApiInterface {
    method(a: number): Promise<string>
}

describe("getApiCreator", () => {
    it("test", async () => {
        let reflection: ApiObjectReflection = {
            methods: {
                method: {
                    params: [{ type: "number" }],
                    return: { type: "string" }
                }
            }
        }
        let creator = getApiCreator(reflection)
        let transport = new TestTransport()
        let api = creator({ transport, reflection }) as TestApiInterface
        let resultPromise = api.method(1)
        expect(transport.getLastSent()[1]).toEqual("method")
        expect((transport.getLastSent()[2] as any)[0]).toEqual(1)
        transport.onMessage.fire(["r", transport.getLastSent()[0], "123"])
        const result = await resultPromise
        expect(result).toEqual("123")

    })
})