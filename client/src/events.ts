/**
 * Main subscription interface
 */
export interface Subscription {
    unsubscribe(): Promise<void>
}

/**
 * All callbacks
 */
export interface Callback<T> {
    (data: T): void
}

/**
 * Interface for client`s event
 */
export interface Event<DATA> {
    subscribe(callback: Callback<DATA>): Promise<Subscription>
}

/**
 * Interface for client`s parametric event
 */
export interface ParametricEvent<DATA, SUBSCRIPTION_PARAMETERS> {
    subscribe(callback: Callback<DATA>, parameters: SUBSCRIPTION_PARAMETERS): Promise<Subscription>
}

interface CoreEventSubscription<T> {
    callback: { (data: T): void }
}

/**
 * CoreEvent is simple event realization for internal usage
 */
export class CoreEvent<T> {

    private subscriptions: Set<CoreEventSubscription<T>> = new Set

    subscribe(callback: Callback<T>): Subscription {
        const privateSubscription: CoreEventSubscription<T> = { callback }
        this.subscriptions.add(privateSubscription)
        return {
            unsubscribe: () => {
                this.subscriptions.delete(privateSubscription)
                return Promise.resolve()
            }
        }
    }

    fire(data: T): void {
        this.subscriptions.forEach(item => {
            try {
                item.callback(data)
            } catch (err) {
                /* istanbul ignore next */
                console.error(err)
            }
        })
    }
}
