import {
    HttpTrustServerConfig,
    ApiMap,
    buildMap,
    HttpTrustServer,
    ObjectProxy,
} from "../src"
import { ClientMessage, ServerMessage, JsonEncoderInterface } from "typedapi-core"
import { Api, TestBooksApiError } from "./utils/Realization"
import { Reflection } from "./utils/Reflection"
import * as request from "request"

describe("HttpTrustServer", () => {

    let api = new Api
    let apiMap: ApiMap
    let apiHttpTrustServer: HttpTrustServer

    const recreateHttpTrustServer = async (config: Partial<HttpTrustServerConfig> = {}) => {
        if (apiHttpTrustServer) {
            await apiHttpTrustServer.destroy()
        }
        apiMap = buildMap(Reflection, api)
        let thisConfig: HttpTrustServerConfig = {
            apiMap,
            port: 8082,
        }
        Object.assign(thisConfig, config)
        apiHttpTrustServer = new HttpTrustServer(thisConfig)
        await apiHttpTrustServer.waitListen()
    }

    beforeAll(async () => {
        await recreateHttpTrustServer()
    })

    beforeEach(async () => {
        await recreateHttpTrustServer()
    })

    afterAll(async () => {
        if (apiHttpTrustServer) {
            await apiHttpTrustServer.destroy()
        }
    })

    const madeRequest = (message: ClientMessage): Promise<ServerMessage> => {
        return new Promise<ServerMessage>((resolve, reject) => {
            let timeout = setTimeout(() => {
                reject(new Error("Connection timeout"))
            }, 1000)
            request(`http://localhost:8082/`, {
                method: "POST",
                json: message,
            }, (requestErr, requestResponse, responseBody) => {
                clearTimeout(timeout)
                if (requestErr) {
                    return reject(requestErr)
                }
                const response = requestResponse

                if (response.statusCode !== 200) {
                    return reject(new Error(responseBody))
                } else {
                    return resolve(responseBody as ServerMessage)
                }

            })
        })
    }


    it("someMethod", async () => {
        let result = await madeRequest([0, "someMethod", []])
        expect(result[0]).toEqual("r")
        expect(result[2]).toEqual(true)
    })

    it("error", async () => {
        let result = await madeRequest([0, "serverErrorMethod", []])
        expect(result[0]).toEqual("er")
        expect(result[2]).toEqual("ServerError")
    })

    it("object proxy", async () => {
        let objectProxy = new ObjectProxy
        objectProxy.setErrors({ TestBooksApiError })
        recreateHttpTrustServer({ objectProxy })
        let result = await madeRequest([0, "errorMethod", []])
        expect(result[0]).toEqual("er")
        expect(result[2]).toEqual("TestBooksApiError")
    })

    it("json encoder", async () => {
        recreateHttpTrustServer({
            jsonEncoder: {
                parse: (data: string) => JSON.parse(data),
                stringify: (data: any) => "[]"
            }
        })
        let result = await madeRequest([0, "errorMethod", []])
        expect(result.length).toEqual(0)
    })

})