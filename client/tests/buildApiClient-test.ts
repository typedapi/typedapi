import { Reflection } from "./utils/Reflection"
import { buildApiClient } from "../src/buildApiClient"
import { TestTransport } from "./utils/TestTransport"
import { Connector } from "../src/Connector"
import Api from "./utils/Interface"

describe("buildApiClient", () => {

    let clearCallbacks = (connector: Connector) => {
        (connector as any).callbacks.forEach((c: any) => c.resolve())
    }

    it("base", () => {
        let transport = new TestTransport()
        let connector = new Connector({
            transport,
            reflection: Reflection
        })
        let apiClient = buildApiClient(Reflection, connector) as unknown as Api
        expect(apiClient).toHaveProperty("books")
        apiClient.books.create({
            title: "title",
            description: "desc"
        })
        expect((transport.getLastSent()[2] as any)[0].title).toEqual("title")

        apiClient.testEvent.subscribe(() => { })
        expect(transport.getLastSent()[1]).toEqual("_.sub")
        expect((transport.getLastSent()[2] as any).event).toEqual("testEvent")

        apiClient.testParametricEvent.subscribe(() => { }, 1)
        expect(transport.getLastSent()[1]).toEqual("_.sub")
        expect((transport.getLastSent()[2] as any).event).toEqual("testParametricEvent")

        clearCallbacks(connector)
    })

})