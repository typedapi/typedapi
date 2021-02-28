import { AuthData } from "./auth"

/**
 * Event callback metadata is data to specify events` direction.
 * Internal usage.
 * Examples:
 * ["u", 1]: fire for user #1
 * ["g", "admins"]: fire for group "admins"
 * ["s", "an9j9"]: fire for session "an9j9"
 * ["c", "412"]: fire for connection #412
 */
export type EventCallbackMetadata = ["u", string | number] | ["g" | "s" | "c", string]

/**
 * Basic subscription type
 */
export type Subscription = {
    unsubscribe(): void,
}

/**
 * Event callback interface.
 * Can be fired with custom metadata to specify events` direction
 * see EventCallbackMetadata
 */
interface Callback<T> {
    (data: T, meta?: EventCallbackMetadata): void
}

/**
 * Comparer for parametric events
 * Should check if parameters of subscriptions fit to event parameters
 */
export type ParametricComparer<DATA, SUBSCRIPTION_PARAMETERS, EVENT_PARAMETERS> = {
    (subscriptionParameters: SUBSCRIPTION_PARAMETERS, data: DATA, eventParameters: EVENT_PARAMETERS): boolean
}

/**
 * Validator for parametric events
 * Should check if current user can subscribe with current subscription parameters.
 * If no, returns error string
 */
export type SubscriptionValidator<SUBSCRIPTION_PARAMETERS> = {
    (subscriptionParameters: SUBSCRIPTION_PARAMETERS, authData: AuthData): Promise<true | string>
}

/**
 * Callback for parametric subscription
 */
export type ParametricSubscriptionCallback<DATA, EVENT_PARAMETERS> = {
    (data: DATA, eventParameters: EVENT_PARAMETERS): void
}

/**
 * Main Event class.
 * Use this class to create events in your backend
 * Generic type T: type of event`s data
 */
export class Event<T> {

    /**
     * Subscriptions map
     */
    protected subscriptions: Map<Subscription, Callback<T>> = new Map

    /**
     * Subscribe to event
     */
    subscribe(callback: Callback<T>): Subscription {
        const subscription: Subscription = {
            unsubscribe: () => {
                this.subscriptions.delete(subscription)
            }
        }
        this.subscriptions.set(subscription, callback)
        return subscription
    }

    /**
     * Fire event for all users
     */
    fire(data: T): void {
        this._fire(data)
    }

    /**
     * Fire event with specific metadata
     */
    private _fire(data: T, meta?: EventCallbackMetadata): void {
        this.subscriptions.forEach(cb => cb(data, meta))
    }

    /**
     * Fire event for single user
     */
    fireForUser(data: T, userId: string | number): void {
        this._fire(data, ["u", userId])
    }

    /**
     * Fire event for user`s group
     */
    fireForGroup(data: T, group: string): void {
        this._fire(data, ["g", group])
    }

    /**
     * Fire event for single session
     */
    fireForSession(data: T, sessionId: string): void {
        this._fire(data, ["s", sessionId])
    }

    /**
     * Fire event for single connection
     */
    fireForConnection(data: T, connectionId: string): void {
        this._fire(data, ["c", connectionId])
    }

}

/**
 * Main parametric event class
 * Use this class to create parametric events in your backend
 * Generic types:
 * DATA: type of data that will be sent tu client
 * SUBSCRIPTION_PARAMETERS: type of parameters that client whould use to subscribe
 * EVENT_PARAMETERS: type of event parameters that will be passed to parametric event comparer
 * Event parameters can have data that used in comparer but not send to client
 */
export class ParametricEvent<DATA, SUBSCRIPTION_PARAMETERS, EVENT_PARAMETERS> {

    /**
     * Subscriptions map
     */
    private subscriptions: Map<Subscription, ParametricSubscriptionCallback<DATA, EVENT_PARAMETERS>> = new Map

    /**
     * @param comparer Comparer method to check if event 
     * should fire for current cubscription
     * @param validator Validator method to check if current
     * user can subscribe to event with such parameters
     */
    constructor(
        public comparer: ParametricComparer<DATA, SUBSCRIPTION_PARAMETERS, EVENT_PARAMETERS>,
        public validator?: SubscriptionValidator<SUBSCRIPTION_PARAMETERS>,
    ) { }

    /**
     * Subscribe to event
     */
    subscribe(callback: ParametricSubscriptionCallback<DATA, EVENT_PARAMETERS>): Subscription {
        const subscription: Subscription = {
            unsubscribe: () => {
                this.subscriptions.delete(subscription)
            }
        }
        this.subscriptions.set(subscription, callback)
        return subscription
    }

    /**
     * Fire event with specific event parameters
     */
    fire(data: DATA, eventParameters: EVENT_PARAMETERS): void {
        this.subscriptions.forEach(s => s(data, eventParameters))
    }

}