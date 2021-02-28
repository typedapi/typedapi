import {
    MethodReflection,
    EventReflection,
    ParametricEventReflection,
} from "typedapi-core"
import { Event, ParametricEvent } from "./events"
import { ApiItemMetadata } from "./decorators"

/**
 * Api map is a map of methods, events, and parametric events.
 * It creating once when server starting and using for fast mathods and events access 
 */
export type ApiMap = {

    /**
     * Methods map
     * method full name => method map item
     */
    readonly methods: MethodsMap

    /**
     * Events map
     * event full name => event map item
     */
    readonly events: EventsMap

    /**
     * Parametric event map
     * event full name => parametric event map item
     */
    readonly parametricEvents: ParametricEventsMap

    /**
     * List of broadcast event names
     */
    readonly broadcastEvents: Set<string>

}

export type MethodsMap = Map<string, MethodMapItem>
export type EventsMap = Map<string, EventMapItem>
export type ParametricEventsMap = Map<string, ParametricEventMapItem>
export type ApiMapMethodInstance = { (...args: unknown[]): Promise<unknown> }

export type MethodMapItem = {

    /**
     * Method full name
     */
    name: string

    /**
     * Method instance
     */
    method: ApiMapMethodInstance

    /**
     * Parent object lint to pass as thisArg
     */
    parent: Record<string, unknown>

    /**
     * Method reflection
     */
    reflection: MethodReflection

    /**
     * Method metadata.
     * Contain objects that can be set via decorators.
     */
    metadata: ApiItemMetadata

}

export type EventMapItem = {

    /**
     * Event full name
     */
    name: string

    /**
     * Event instance
     */
    event: Event<unknown>

    /**
     * Event reflection
     */
    reflection: EventReflection

    /**
     * Event metadata.
     * Contain objects that can be set via decorators.
     */
    metadata: ApiItemMetadata

}

export type ParametricEventMapItem = {

    /**
     * Event full name
     */
    name: string

    /**
     * Event instance
     */
    event: ParametricEvent<unknown, unknown, unknown>

    /**
     * Event reflection
     */
    reflection: ParametricEventReflection

    /**
     * Event metadata.
     * Contain objects that can be set via decorators.
     */
    metadata: ApiItemMetadata

}
