import {
    ServerEventMessage,
    RequestError,
    JsonEncoderInterface,
    ClientMessage,
    ServerMessage,
} from "typedapi-core"
import { Event, EventCallbackMetadata, Subscription } from "./events"
import { validate } from "./validation"
import { AuthData, ConnectionData } from "./auth"
import { ApiMap, EventsMap, ParametricEventsMap, EventMapItem, ParametricEventMapItem } from "./ApiMap"
import { ApiItemMetadata } from "./decorators"
import {
    isSubscribeDataInterface,
    isUnsubscribeDataInterface,
} from "./clientDataReflections"

/**
 * Events proxy configuration object
 */
export interface EventsProxyConfig {
    apiMap: ApiMap
    jsonEncoder?: JsonEncoderInterface
}

export interface EventsProxyOnSendData {
    meta?: EventCallbackMetadata
    data: ServerEventMessage
    eventMeta: ApiItemMetadata
}

/**
 * EventsProxy class using for proxy events from Api instance to client
 */
export class EventsProxy {

    /**
     * Events maps that come from config
     */
    protected eventsMap: EventsMap

    /**
     * ParametricEvents maps that come from config
     */
    protected parametricEventsMap: ParametricEventsMap

    /**
     * On send event. When fired, server should send string message to specific connections
     */
    public readonly onSend = new Event<EventsProxyOnSendData>()

    /**
     * All subscriptions to events to unsubscribe on destroy
     */
    protected allMySubscriptions: Subscription[] = []

    /**
     * Events subscriptions list
     * <[event name], [set of connections ids]>
     */
    protected eventsSubscriptions: Map<string, Set<string>> = new Map

    /**
     * Parametric subscriptions map
     * Map<string[event name],Map<string[connection id],Map<number[subscription id], any[subscription parameters]>>>
     */
    protected parametricEventSubscriptions: Map<string, Map<string, Map<number, unknown>>> = new Map

    constructor(apiMap: ApiMap) {
        this.eventsMap = apiMap.events
        this.parametricEventsMap = apiMap.parametricEvents
        this.eventsMap.forEach(eventData => {
            const subscription = eventData.event.subscribe(
                (data, meta) => this.eventFired(eventData, data, meta)
            )
            this.allMySubscriptions.push(subscription)
        })
        this.parametricEventsMap.forEach(eventData => {
            const subscription = eventData.event.subscribe(
                (data, eventParameters) => this.parametricEventFired(eventData, data, eventParameters)
            )
            this.allMySubscriptions.push(subscription)
        })
    }

    /**
     * Check if event with this name exists
     */
    public hasEvent(event: string): boolean {
        return this.eventsMap.has(event)
    }

    /**
     * Check if parametric event with this name exists
     */
    public hasParametricEvent(event: string): boolean {
        return this.parametricEventsMap.has(event)
    }

    /**
     * Get subscriptions for event
     */
    public getSubscriptions(event: string): Set<string> | undefined {
        return this.eventsSubscriptions.get(event)
    }

    async subscribeToEventFromRequest(messageData: ClientMessage, connectionData: ConnectionData): Promise<ServerMessage> {
        const systemMethod = messageData[1]
        const data = messageData[2]
        const connectionId = connectionData.connectionId
        if (!connectionId) {
            throw new Error("Connection id not found")
        }
        switch (systemMethod) {
            case "_.sub":
                if (!isSubscribeDataInterface(data)) {
                    throw new RequestError("Bad subscription data")
                }
                if (this.hasEvent(data.event)) {
                    await this.subscribeToEvent(data.event, connectionId)
                    return ["r", messageData[0]]
                } else if (this.hasParametricEvent(data.event)) {
                    const subscriptionId = await this.subscribeToParametricEvent(data.event, data.parameters, connectionId, connectionData.authData)
                    return ["r", messageData[0], subscriptionId]
                } else {
                    throw new RequestError(`Event "${data.event}" not found`)
                }
            case "_.unsub":
                if (!isUnsubscribeDataInterface(data)) {
                    throw new RequestError("Bad unsubscription data")
                }
                if (this.hasEvent(data.event)) {
                    this.unsubscribeFromEvent(data.event, connectionId)
                } else if (this.hasParametricEvent(data.event)) {
                    if (!data.subscriptionId) {
                        throw new RequestError("Bad unsubscription data")
                    }
                    this.unsubscribeFromParametricEvent(data.event, connectionId, data.subscriptionId)
                } else {
                    throw new RequestError(`Event "${data.event}" not found`)
                }
                return ["r", messageData[0]]

            default:
                throw new RequestError(`Method ${systemMethod} not found`)
        }
    }

    /**
     * Subscribe connection to event
     */
    public subscribeToEvent(event: string, connection: string): Promise<void> {
        const eventData = this.eventsMap.get(event)
        if (!eventData) {
            throw new RequestError(`Event ${event} not found`)
        }
        // Broadcast event dont need subscription
        if (eventData.metadata.broadcastEvent) {
            return Promise.resolve()
        }
        let subscriptionsSet = this.eventsSubscriptions.get(event)
        if (!subscriptionsSet) {
            subscriptionsSet = new Set
            this.eventsSubscriptions.set(event, subscriptionsSet)
        }
        subscriptionsSet.add(connection)
        return Promise.resolve()
    }

    /**
     * Unsubscribe connection from event
     */
    public unsubscribeFromEvent(event: string, connection: string): Promise<void> {
        const subscriptionsSet = this.eventsSubscriptions.get(event)
        if (subscriptionsSet) {
            subscriptionsSet.delete(connection)
        }
        return Promise.resolve()
    }

    /**
     * Subscribe connection to parametric event
     * @param event event full name
     * @param parameters subscription parameters
     * @param connection connection
     * @param authData auth data
     * @returns Promise<number> subscription id
     */
    public async subscribeToParametricEvent(event: string, parameters: unknown, connection: string, authData: AuthData): Promise<number> {
        const eventData = this.parametricEventsMap.get(event)
        if (!eventData) {
            throw new RequestError(`Event ${event} not found`)
        }
        const validateResult = validate(eventData.reflection.subscriptionType, parameters, event)
        if (validateResult !== true) {
            throw new RequestError(`Unable to subscribe to event ${event}: ${validateResult}`)
        }
        if (eventData.event.validator) {
            const validated = await eventData.event.validator(parameters, authData)
            if (validated !== true) {
                throw new RequestError(`Unable to subscribe to event ${event}: ${validated}`)
            }
        }
        let subscriptionsMap = this.parametricEventSubscriptions.get(event)
        if (!subscriptionsMap) {
            subscriptionsMap = new Map
            this.parametricEventSubscriptions.set(event, subscriptionsMap)
        }
        let customerSubscriptionsMap = subscriptionsMap.get(connection)
        if (!customerSubscriptionsMap) {
            customerSubscriptionsMap = new Map
            subscriptionsMap.set(connection, customerSubscriptionsMap)
        }
        const subscriptionIndex = this.getNextParameticSubscriptionIndex()
        customerSubscriptionsMap.set(subscriptionIndex, parameters)
        return subscriptionIndex
    }

    /**
     * Unsubscribe connection from event by subscriptionId
     * @param event 
     * @param connection 
     * @param subscriptionId 
     */
    public unsubscribeFromParametricEvent(event: string, connection: string, subscriptionId: number): Promise<void> {
        const subscriptionsMap = this.parametricEventSubscriptions.get(event)
        if (subscriptionsMap) {
            const customerSubscriptionsMap = subscriptionsMap.get(connection)
            if (customerSubscriptionsMap) {
                customerSubscriptionsMap.delete(subscriptionId)
            }
        }
        return Promise.resolve()
    }

    /**
     * Drop all subscriptions for connection     
     */
    public dropConnection(connection: string): void {
        this.eventsSubscriptions.forEach(set => set.delete(connection))
        this.parametricEventSubscriptions.forEach(map => map.delete(connection))
    }

    /**
     * Parametric subscription index
     */
    protected parametricSubscriptionIndex = 0

    /**
     * Parametric subscription indexer
     */
    private getNextParameticSubscriptionIndex(): number {
        this.parametricSubscriptionIndex++
        if (this.parametricSubscriptionIndex >= Number.MAX_SAFE_INTEGER) {
            this.parametricSubscriptionIndex = 1
        }
        return this.parametricSubscriptionIndex
    }

    /**
     * Event handler that work after server`s event fire method called
     */
    private eventFired(eventData: EventMapItem, data: unknown, meta?: EventCallbackMetadata) {
        this.onSend.fire({
            data: ["ev", eventData.name, data],
            meta,
            eventMeta: eventData.metadata
        })
    }

    /**
     * Event handler that work after server`s parametric event fire method called
     */
    private parametricEventFired(eventData: ParametricEventMapItem, data: unknown, eventParameters: unknown) {
        const subscriptions = this.parametricEventSubscriptions.get(eventData.name)
        if (!subscriptions) return
        subscriptions.forEach((subscriberParametersSet, connection) => {
            subscriberParametersSet.forEach((subscriptionParameters, subscriptionId) => {
                if (eventData.event.comparer(subscriptionParameters, data, eventParameters)) {
                    this.onSend.fire({
                        meta: ["c", connection],
                        data: ["ev", eventData.name, data, subscriptionId],
                        eventMeta: eventData.metadata
                    })
                }
            })
        })
    }

    /**
     * Destroy all subscriptions
     */
    destroy(): void {
        this.allMySubscriptions.forEach(s => s.unsubscribe())
    }
}