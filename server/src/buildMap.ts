import { ApiObjectReflection } from "typedapi-core"
import { ApiItemMetadata, getMetadata, extendMetadata } from "./decorators"
import { ApiMap, ApiMapMethodInstance } from "./ApiMap"
import { Event, ParametricEvent } from "./events"

/**
 * Building map from reflection and realization for internal usage
 */
export const buildMap = (reflection: ApiObjectReflection, realization: unknown, nodeId = "core"): ApiMap => {
    const map: ApiMap = {
        methods: new Map,
        events: new Map,
        parametricEvents: new Map,
        broadcastEvents: new Set,
    }
    buildMapPrivate(map, reflection, realization as Record<string, unknown>, nodeId)
    return map
}

const buildMapPrivate = (
    map: ApiMap,
    object: ApiObjectReflection,
    realization: Record<string, unknown>,
    nodeId: string,
    propertyName?: string,
    metadata: ApiItemMetadata = {},
) => {

    if (object.events) {
        for (const eventName in object.events) {
            const fullEventName = propertyName ? propertyName + "." + eventName : eventName
            const eventMetadata = extendMetadata(metadata, getMetadata(realization, eventName))
            if (eventMetadata.broadcastEvent) {
                map.broadcastEvents.add(fullEventName)
            }
            map.events.set(fullEventName, {
                name: fullEventName,
                event: realization[eventName] as Event<unknown>,
                reflection: object.events[eventName],
                metadata: eventMetadata
            })
        }
    }

    if (object.parametricEvents) {
        for (const eventName in object.parametricEvents) {
            const fullEventName = propertyName ? propertyName + "." + eventName : eventName
            map.parametricEvents.set(fullEventName, {
                name: fullEventName,
                event: realization[eventName] as ParametricEvent<unknown, unknown, unknown>,
                reflection: object.parametricEvents[eventName],
                metadata: extendMetadata(metadata, getMetadata(realization, eventName))
            })
        }
    }

    if (object.methods) {
        for (const childMethodName in object.methods) {
            const fullMethodName = propertyName ? propertyName + "." + childMethodName : childMethodName
            map.methods.set(fullMethodName, {
                name: fullMethodName,
                method: realization[childMethodName] as ApiMapMethodInstance,
                reflection: object.methods[childMethodName],
                parent: realization,
                metadata: extendMetadata(metadata, getMetadata(realization, childMethodName)),
            })
        }
    }

    if (object.children) {
        for (const childPropertyName in object.children) {
            const fullPropertyName = propertyName ? propertyName + "." + childPropertyName : childPropertyName
            const childMetadata = extendMetadata(metadata, getMetadata(realization, childPropertyName))
            buildMapPrivate(
                map,
                object.children[childPropertyName],
                realization[childPropertyName] as Record<string, unknown>,
                nodeId,
                fullPropertyName,
                childMetadata,
            )
        }
    }

}