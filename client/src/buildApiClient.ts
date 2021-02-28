import { Connector } from "./Connector"
import { ApiObjectReflection } from "typedapi-core"
import { Callback } from "./events"

/**
 * Building api client for Api interface that proxy all requests to connector
 */
export const buildApiClient = (reflection: ApiObjectReflection, connection: Connector): Record<string, unknown> => {
    return buildApiClientPrivate(reflection, connection)
}

const buildApiClientPrivate = (reflection: ApiObjectReflection, connector: Connector, prefix = ""): Record<string, unknown> => {
    const returnValue: Record<string, unknown> = {}
    if (reflection.methods) {
        for (const methodName in reflection.methods) {
            returnValue[methodName] = createMethodCallback(prefix + methodName, connector)
        }
    }
    if (reflection.events) {
        for (const eventName in reflection.events) {
            returnValue[eventName] = createEvent(prefix + eventName, connector)
        }
    }
    if (reflection.parametricEvents) {
        for (const eventName in reflection.parametricEvents) {
            returnValue[eventName] = createParametricEvent(prefix + eventName, connector)
        }
    }
    if (reflection.children) {
        for (const childName in reflection.children) {
            returnValue[childName] = buildApiClientPrivate(reflection.children[childName], connector, prefix + childName + ".")
        }
    }
    return returnValue
}

const createMethodCallback = (method: string, connector: Connector) => {
    return (...args: unknown[]) => connector.callMethod(method, args)
}

const createEvent = (eventName: string, connector: Connector) => {
    return { subscribe: async (cb: Callback<unknown>) => connector.subscribe(eventName, cb) }
}

const createParametricEvent = (eventName: string, connector: Connector) => {
    return { subscribe: (cb: Callback<unknown>, parameters: unknown) => connector.subscribeParametric(eventName, parameters, cb) }
}