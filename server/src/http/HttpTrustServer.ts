import * as http from "http"
import {
    JsonEncoderInterface,
    ClientError,
    RequestError,
    ClientMessage,
    ServerMessage,
} from "typedapi-core"
import { ApiMap } from "../ApiMap"
import { ObjectProxy } from "../ObjectProxy"

/**
 * method, data
 */

export interface HttpTrustServerConfig {
    apiMap: ApiMap
    port: number
    jsonEncoder?: JsonEncoderInterface
    objectProxy?: ObjectProxy
}

/**
 * HttpTrustServer is need when you want to run api server as microservice.
 * It receive prevalidated ClientMessage, call api method, and return response
 * Designed to work in pair with HttpProxyClient
 */
export class HttpTrustServer {

    private server: http.Server
    private jsonEncoder: JsonEncoderInterface
    private apiMap: ApiMap
    private objectProxy: ObjectProxy
    private listenStarted?: true
    private listenError?: unknown

    constructor(config: HttpTrustServerConfig) {
        this.server = http.createServer((req, res) => this.onRequest(req, res))
        this.server.on("listening", () => this.listenStarted = true)
        /* istanbul ignore next */
        this.server.on("error", err => this.listenError = err)
        this.server.listen(config.port)
        this.jsonEncoder = config.jsonEncoder ?? JSON
        this.apiMap = config.apiMap
        this.objectProxy = config.objectProxy ?? new ObjectProxy
    }

    waitListen(): Promise<void> {
        if (this.listenStarted) {
            return Promise.resolve()
        }
        /* istanbul ignore next */
        if (this.listenError) {
            return Promise.reject(this.listenError)
        }
        return new Promise((resolve, reject) => {
            setTimeout(() => this.waitListen().then(resolve).catch(reject), 5)
        })
    }

    private onRequest(req: http.IncomingMessage, res: http.ServerResponse) {
        const body: Uint8Array[] = []
        req.on("data", chunk => body.push(chunk))
        req.on("end", async () => {
            try {
                res.setHeader("Content-Type", "application/json")
                const data = this.jsonEncoder.parse(Buffer.concat(body).toString()) as ClientMessage
                const methodInfo = this.apiMap.methods.get(data[1])
                /* istanbul ignore next */
                if (!methodInfo) {
                    throw new RequestError(`Method ${data[0]} not found`)
                }
                const response = await methodInfo.method.apply(methodInfo.parent, data[2] as unknown[])
                const returnValue: ServerMessage = ["r", 0, response]
                res.end(this.jsonEncoder.stringify(returnValue))
            } catch (err) {
                /* istanbul ignore next */
                if (res.writableEnded) {
                    console.error(err)
                    return
                }
                let returnValue: ServerMessage
                if (err instanceof ClientError) {
                    returnValue = ["er", 0, this.objectProxy.getErrorCode(err), err.serialize()]
                } else {
                    returnValue = ["er", 0, "ServerError", err.message + "\n" + err.stack]
                }
                res.end(this.jsonEncoder.stringify(returnValue))
            }
        })

        /* istanbul ignore next */
        req.on("error", err => console.error(err))
    }

    destroy(): Promise<void> {
        return new Promise(resolve => this.server.close(() => resolve()))
    }
}