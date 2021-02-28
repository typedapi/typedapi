import {
    RequestError,
    NotAuthorizedError,
    ClientMessage,
    ServerMethodResponseMessage,
    ServerError,
    MethodReflection
} from "typedapi-core"
import { validateMethod } from "./validation"
import { filterMethod, filterOut, filterOutFast } from "./filter"
import { ConnectionData } from "./auth"
import { MethodsMap, ApiMap } from "./ApiMap"

export interface MethodProxyConfig {

    /**
     * Api map
     */
    apiMap: ApiMap

    /**
     * Set true to disable output filtering for all methods
     */
    noFilter?: boolean

    /**
     * Set true to enable output fast filtering for all methods
     */
    fastFilter?: boolean
}

/**
 * Method proxy class is used for call api methods 
 * by client message data, validate it and return response
 */
export class MethodProxy {

    protected methodsMap: MethodsMap

    constructor(private config: MethodProxyConfig) {
        this.methodsMap = config.apiMap.methods
    }

    /**
     * Call method by client data message
     * @param message Client message data
     * @param connectionData Client connection data
     */
    async callByClientMesssage(message: ClientMessage, connectionData: ConnectionData): Promise<ServerMethodResponseMessage> {
        const result = await this.call(message[1], message[2], connectionData)
        return result === undefined ? ["r", message[0]] : ["r", message[0], result]
    }

    /**
     * Call api method by string name, data, and connection info
     */
    private async call(method: string, data: unknown, connectionData: ConnectionData): Promise<unknown> {

        const methodData = this.methodsMap.get(method)
        if (!methodData) {
            throw new RequestError(`Method ${method} not found`)
        }

        // Check access using groups
        if (methodData.metadata.groups && methodData.metadata.groups.length) {
            const userGroups = connectionData.authData.groups
            // If user has no groups or his groups not intersect with method groups then access denied
            if (!userGroups || !methodData.metadata.groups.find(v => userGroups.includes(v))) {
                throw new RequestError("Access Denied")
            }
        }

        const validationResult = validateMethod(methodData.reflection, (data as unknown[]) ?? [], method)

        if (validationResult !== true) {
            throw new RequestError(validationResult)
        }

        data = filterMethod(data as unknown[], methodData.reflection)
        this.fillInjections(methodData.reflection, data, connectionData)

        let result = await methodData.method.apply(methodData.parent, data as unknown[])
        if (methodData.reflection.return) {
            if (methodData.reflection.return.type !== "injection") {
                const metadata = methodData.metadata
                if (!this.config.noFilter && !metadata.noFilter) {
                    if (this.config.fastFilter || metadata.fastFilter) {
                        result = filterOutFast(result, methodData.reflection.return)
                    } else {
                        result = filterOut(result, methodData.reflection.return)
                    }
                }
            }
        } else {
            result = undefined
        }

        return result
    }

    /**
     * Fill input injections
     * (authData, connectionData, apiUserId)
     */
    private fillInjections(reflection: MethodReflection, data: unknown, connectionData: ConnectionData) {
        if (!Array.isArray(data) || !reflection.params) return
        for (let i = 0; i < reflection.params.length; i++) {
            const parameterReflection = reflection.params[i]
            if (parameterReflection.type === "injection") {
                let injection: unknown = null
                switch (parameterReflection.injectionType) {
                    case "apiUserId":
                        injection = connectionData.authData.id
                        if (!parameterReflection.optional && !injection) {
                            throw new NotAuthorizedError()
                        }
                        break
                    case "apiAuthData":
                        injection = connectionData.authData
                        break
                    case "apiConnectionData":
                        injection = connectionData
                        break
                    default:
                        throw new ServerError(`Bad injection: ${parameterReflection.injectionType}`)
                }
                if (data.length > i) {
                    data.splice(i, 0, injection)
                } else {
                    data.push(injection)
                }
            }
        }
    }

}