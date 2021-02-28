import { ApiMap, MethodMapItem } from "../ApiMap"
import {
    JsonEncoderInterface,
    ServerMessage,
} from "typedapi-core"
import { ObjectProxy } from "../ObjectProxy"

import * as http from "http"

export interface HttpProxyClientConfig {

    /**
     * Remote HttpTrustServer host
     */
    host?: string

    /**
     * Remote HttpTrustServer port
     */    
    port?: string

    /**
     * Which methods to replace
     * "methodName": only one method
     * "users.*": group of methods that starts with "users."
     * "*": all methods
     * ["users.*","methodName"]: combine filters
     */
    methodsPattern: string | string[]

    /**
     * Remote node identification for logging
     */
    remoteNodeId: string

    apiMap: ApiMap
    jsonEncoder?: JsonEncoderInterface
    objectProxy?: ObjectProxy
}

/**
 * HttpProxyClient is need to process Api requests on outside server.
 * It replace methods in ApiMap with http requests.
 * use methodsPattern to define which methods should be replaced.
 * It designed to work in pair with HttpTrustServer.
 */
export class HttpProxyClient {

    private jsonEncoder: JsonEncoderInterface
    private objectProxy: ObjectProxy
    private affectedMethods: string[] = []

    constructor(private config: HttpProxyClientConfig) {
        this.jsonEncoder = config.jsonEncoder ?? JSON
        this.objectProxy = config.objectProxy ?? new ObjectProxy
        config.apiMap.methods.forEach(methodData => {
            if (this.isMethodApplicable(methodData, config.methodsPattern)) {
                this.affectedMethods.push(methodData.name)
                methodData.method = (...args: unknown[]) => this.call(methodData.name, args)
            }
        })
    }

    /**
     * Call remote TypedApi method
     */
    call(method: string, args: unknown[]): Promise<unknown> {
        return new Promise<unknown>((resolve, reject) => {

            const body = this.jsonEncoder.stringify([0, method, args])
            const request = http.request({
                host: this.config.host,
                port: this.config.port,
                path: "/",
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Content-Length": body.length,
                },
            }, response => {
                /* istanbul ignore next */
                if (response.statusCode !== 200) {
                    return reject(`Server return status: ${response.statusCode} ${response.statusMessage}`)
                }
                let reply = ""
                response.on("data", chunk => {
                    reply += chunk
                })
                response.on("end", () => {
                    try {
                        const data = this.jsonEncoder.parse(reply) as ServerMessage
                        // process response
                        if (data[0] === "r") {
                            return resolve(data[2])
                        }
                        //process error
                        else if (data[0] === "er") {
                            const err = new (this.objectProxy.getErrorClass(data[2]))
                            err.restore(data[3])
                            reject(err)
                        }

                        else {
                            reject(new Error(`Bad data received: ${JSON.stringify(data)}`))
                        }

                    } catch (err) {
                        reject(err)
                    }
                })
                /* istanbul ignore next */
                response.on("error", err => {
                    err.message = "Connection error to node " + this.config.remoteNodeId + ": " + err.message
                    reject(err)
                })
            })
            request.end(body)
        })
    }

    private isMethodApplicable(methodData: MethodMapItem, methodsPattern: string | string[]): boolean {
        if (Array.isArray(methodsPattern)) {
            for (const p of methodsPattern) {
                if (this.isMethodApplicable(methodData, p)) {
                    return true
                }
            }
            return false
        }
        if (methodsPattern === "*") return true
        if (methodsPattern.indexOf("*") === -1) return methodData.name === methodsPattern
        const regexp = new RegExp("^" + methodsPattern.replace(".", "\\.").replace("*", ".*") + "$")
        return !!methodData.name.match(regexp)
    }

    /**
     * Which methods of ApiMap was affected by HttpProxyClient
     */
    getAffectedMethods(): string[] {
        return this.affectedMethods
    }
}