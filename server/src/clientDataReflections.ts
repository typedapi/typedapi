import {
    ClientMessage,
    TypeReflection,
} from "typedapi-core"
import {
    validate,
} from "./validation"

const clientMessageReflection: TypeReflection = {
    type: "Tuple",
    tupleTypes: [
        { type: "number" },
        { type: "string" },
        { type: "unknown", optional: true },
    ]
}

const clientMessageReflectionArray: TypeReflection = {
    type: "Array",
    arrayElementType: clientMessageReflection
}

export const isApiClientMessageInterface = (param: unknown): param is ClientMessage => {
    return validate(clientMessageReflection, param, undefined, true) === true
}

export const isApiClientMessageInterfaceArray = (param: unknown): param is ClientMessage[] => {
    return validate(clientMessageReflectionArray, param, undefined, true) === true
}

export interface SubscribeDataInterface {
    event: string
    parameters?: unknown
}

const subscribeDataReflection: TypeReflection = {
    type: "object",
    children: {
        event: { type: "string" },
        parameters: { type: "unknown", optional: true }
    }
}

export const isSubscribeDataInterface = (param: unknown): param is SubscribeDataInterface => {
    return validate(subscribeDataReflection, param, undefined, true) === true
}

export interface UnsubscribeDataInterface {
    event: string
    subscriptionId?: number
}

const unsubscribeDataReflection: TypeReflection = {
    type: "object",
    children: {
        event: { type: "string" },
        subscriptionId: { type: "number", optional: true }
    }
}

export const isUnsubscribeDataInterface = (param: unknown): param is UnsubscribeDataInterface => {
    return validate(unsubscribeDataReflection, param) === true
}