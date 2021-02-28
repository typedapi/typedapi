import { Reflection } from "./utils/Reflection"
import { Api } from "./utils/Realization"
import {
    buildMap,
    HttpProxyClient,
    ObjectProxy,
} from "../src"
import {
    JsonEncoderInterface,
    ServerError,
    ServerMessage,
    ClientMessage,
} from "typedapi-core"
import * as http from "http"
import { create } from "domain"

describe("HttpProxyClient", () => {

    it("method replacement", () => {

        const api = new Api
        let apiMap = buildMap(Reflection, api)
        let client = new HttpProxyClient({
            apiMap,
            methodsPattern: "books.count",
            remoteNodeId: "node"
        })
        expect(client.getAffectedMethods().length).toEqual(1)
        expect(client.getAffectedMethods()[0]).toEqual("books.count")

        apiMap = buildMap(Reflection, api)
        client = new HttpProxyClient({
            apiMap,
            methodsPattern: "*",
            remoteNodeId: "node"
        })
        expect(client.getAffectedMethods().length).toEqual(apiMap.methods.size)

        apiMap = buildMap(Reflection, api)
        client = new HttpProxyClient({
            apiMap,
            methodsPattern: "books.*",
            remoteNodeId: "node"
        })
        expect(client.getAffectedMethods().length).toEqual(Object.keys(Reflection.children!.books!.methods as {}).length)

        apiMap = buildMap(Reflection, api)
        client = new HttpProxyClient({
            apiMap,
            methodsPattern: ["books.*", "testInjectionMethod8"],
            remoteNodeId: "node"
        })
        expect(client.getAffectedMethods().length).toEqual(Object.keys(Reflection.children!.books!.methods as {}).length + 1)


    })

    it("custom json encoder", () => {
        const api = new Api
        const apiMap = buildMap(Reflection, api)
        const jsonEncoder: JsonEncoderInterface = {
            parse: () => { },
            stringify: () => ""
        }
        const client = new HttpProxyClient({
            apiMap,
            methodsPattern: ["books.*", "testInjectionMethod8"],
            remoteNodeId: "node",
            jsonEncoder
        })
        expect((client as any).jsonEncoder.parse).toEqual(jsonEncoder.parse)
    })

    it("custom object proxy", () => {
        const api = new Api
        const apiMap = buildMap(Reflection, api)
        const objectProxy = new ObjectProxy()
        const client = new HttpProxyClient({
            apiMap,
            methodsPattern: ["books.*", "testInjectionMethod8"],
            remoteNodeId: "node",
            objectProxy,
        })
        expect((client as any).objectProxy).toEqual(objectProxy)
    })


    let returnValue: string = ""
    let inputValue: string = ""

    const sleep = (ms: number): Promise<void> => new Promise(resolve => setTimeout(resolve, ms))
    let currentHttpServer: http.Server | undefined

    const getServer = (): Promise<http.Server> => {
        return new Promise((resolve, reject) => {
            const server = http.createServer((req, res) => {
                const body: Uint8Array[] = []
                req.on("data", chunk => body.push(chunk))
                req.on("end", () => {
                    inputValue = Buffer.concat(body).toString()
                    res.setHeader("Content-Type", "application/json")
                    if (returnValue.length) {
                        res.end(returnValue)
                    } else {
                        res.statusCode = 300
                        res.end("Bad data")
                    }

                })
            })
            server.on("listening", () => {
                currentHttpServer = server
                resolve(server)
            })
            server.on("error", err => {
                console.error(err)
                reject(err)
            })
            server.listen(8081)
        })
    }

    const closeServer = (server: http.Server | undefined = currentHttpServer): Promise<void> => {
        if (currentHttpServer === server) {
            currentHttpServer = undefined
        }
        if (!server) {
            server = currentHttpServer
        }
        if (!server) return Promise.resolve()
        return new Promise((resolve, reject) => server!.close(err => err ? reject(err) : resolve()))
    }

    afterEach(async () => {
        await closeServer()
    })

    it("method calling", async () => {
        returnValue = JSON.stringify(["r", 0, 1])
        await getServer()
        const api = new Api
        const apiMap = buildMap(Reflection, api)
        const client = new HttpProxyClient({
            apiMap,
            methodsPattern: ["books.*", "testInjectionMethod8"],
            remoteNodeId: "node",
            port: "8081"
        })
        const methodInfo = apiMap.methods.get("books.count")!
        let result = (await methodInfo.method.apply(methodInfo.parent, []) as ServerMessage[])
        expect(inputValue).toEqual(JSON.stringify([0, "books.count", []]))
        expect(result).toEqual(1)

        returnValue = JSON.stringify(["er", 0, 1])
        await expect(methodInfo.method.apply(methodInfo.parent, [])).rejects.toThrow()

        returnValue = JSON.stringify(["x", 0, 1])
        await expect(methodInfo.method.apply(methodInfo.parent, [])).rejects.toThrow()

        returnValue = "Hello!"
        await expect(methodInfo.method.apply(methodInfo.parent, [])).rejects.toThrow()
    })

})