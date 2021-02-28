import { Callback, CoreEvent, Subscription } from "./events"
import { ClientMessage, ServerMessage, MethodReflection, EventReflection, ParametricEventReflection, ApiObjectReflection } from "typedapi-core"
import { ObjectProxy } from "./ObjectProxy"
import { filter } from "./filter"
import { TransportInterface, TransportConnectionStatus } from "./TransportInterface"

export interface ConnectorConfig {
    transport: TransportInterface
    objectProxy?: ObjectProxy
    reflection: ApiObjectReflection
}

/**
 * Connector class implements main Client functionality
 * - preparing request for server
 * - storing subscriptions
 * - preparing response for client
 * - notify client on events
 */
export class Connector {
    private subscriptions: Map<string, Set<{ cb: Callback<unknown> }>> = new Map
    private parametricSubscriptions: Map<number, Callback<unknown>> = new Map
    private requestIdIndex = 0
    private callbacks: Map<number, { time: number, resolve: { (value: unknown): void }, reject: { (err: unknown): void }, method: string }> = new Map
    readonly connectionStatusChanged: CoreEvent<TransportConnectionStatus> = new CoreEvent
    private transport: TransportInterface
    private objectProxy: ObjectProxy
    private reflection: ApiObjectReflection
    private methodsReflections: Record<string, MethodReflection> = {}
    private eventsReflections: Record<string, EventReflection> = {}
    private parametricEventsReflections: Record<string, ParametricEventReflection> = {}

    constructor(config: ConnectorConfig) {
        this.transport = config.transport
        this.objectProxy = config.objectProxy ?? new ObjectProxy
        this.transport.onMessage.subscribe(data => this.processMessage(data))
        this.transport.connectionStatusChanged.subscribe(status => this.connectionStatusChanged.fire(status))
        this.reflection = config.reflection
        this.fillReflections(this.reflection)
    }

    private processMessage(data: ServerMessage) {

        switch (data[0]) {

            case "r": {
                const callback = this.callbacks.get(data[1])
                if (!callback) break
                this.callbacks.delete(data[1])
                const method = callback.method
                if (method.startsWith("_.")) {
                    callback.resolve(data[2])
                    break
                }
                const methodReflection = this.methodsReflections[method]
                if (!methodReflection.return) {
                    callback.resolve(data[2])
                    break
                }
                callback.resolve(filter(data[2], methodReflection.return, "in"))
                break
            }
            case "ev":
                if (data[3]) { // with subsctiption id
                    const subscription = this.parametricSubscriptions.get(data[3])
                    const parametricEventReflection = this.parametricEventsReflections[data[1]]
                    if (subscription) {
                        if (parametricEventReflection.dataType) {
                            subscription(filter(data[2], parametricEventReflection.dataType, "in"))
                        } else {
                            subscription(undefined)
                        }

                    }
                } else {
                    const subscriptions = this.subscriptions.get(data[1])
                    if (subscriptions) {
                        const eventReflection = this.eventsReflections[data[1]]
                        if (eventReflection.dataType) {
                            const sendData = filter(data[2], eventReflection.dataType, "in")
                            subscriptions.forEach(sub => sub.cb(sendData))
                        } else {
                            subscriptions.forEach(sub => sub.cb(undefined))
                        }

                    }
                }
                break

            case "er": {
                const callback = this.callbacks.get(data[1])
                /* istanbul ignore else */
                if (callback) {
                    this.callbacks.delete(data[1])
                    callback.reject(this.objectProxy.getErrorFromServerMessage(data))
                } else {
                    console.error("error without cb", data)
                }
                break
            }
            /* istanbul ignore next */
            default:
                // something wrong                
                console.error("bad data:", data)

        }

    }

    async subscribe(event: string, callback: Callback<unknown>): Promise<Subscription> {
        let subscriptions = this.subscriptions.get(event)
        if (!subscriptions) {
            subscriptions = new Set
            this.subscriptions.set(event, subscriptions)
        }
        if (subscriptions.size === 0) {
            await this.call("_.sub", { event })
        }
        const sub = { cb: callback }
        subscriptions.add(sub)
        return {
            unsubscribe: async () => {
                const subscriptions = this.subscriptions.get(event)
                /* istanbul ignore else */
                if (subscriptions) {
                    subscriptions.delete(sub)
                    if (subscriptions.size === 0) {
                        await this.call("_.unsub", { event })
                    }
                }

            }
        }
    }

    async subscribeParametric(event: string, parameters: unknown, callback: Callback<unknown>): Promise<Subscription> {
        const parametricEventReflection = this.parametricEventsReflections[event]
        parameters = filter(parameters, parametricEventReflection.subscriptionType, "in")
        const subscriptionId: number = (await this.call("_.sub", { event, parameters })) as number
        this.parametricSubscriptions.set(subscriptionId, callback)
        return {
            unsubscribe: async () => {
                this.parametricSubscriptions.delete(subscriptionId)
                await this.call("_.unsub", { event, subscriptionId })
            }
        }
    }

    async callMethod(method: string, data: unknown[]): Promise<unknown> {
        const methodReflection = this.methodsReflections[method]
        if (!methodReflection || !methodReflection.params) {
            return this.call(method)
        }
        const newData: unknown[] = []
        for (let i = 0; i < methodReflection.params.length; i++) {
            const param = methodReflection.params[i]
            if (param.optional && data[i] === undefined && data.length < i + 1) break
            newData.push(filter(data[i], param, "out"))
        }
        return this.call(method, newData)
    }

    private call(method: string, data?: unknown): Promise<unknown> {
        const requestId = this.getRequestId()
        const sendData: ClientMessage = data === undefined ? [requestId, method] : [requestId, method, data]
        const promise = new Promise<unknown>((resolve, reject) => {
            this.callbacks.set(requestId, { resolve, reject, time: Date.now(), method })
        })
        this.transport.send(sendData)
        return promise
    }

    getConnectionStatus(): TransportConnectionStatus {
        return this.transport.getConnectionStatus()
    }

    private getRequestId(): number {
        this.requestIdIndex++
        return this.requestIdIndex
    }

    private fillReflections(reflection: ApiObjectReflection, parentKey?: string): void {
        if (reflection.children) {
            for (const key in reflection.children) {
                this.fillReflections(reflection.children[key], parentKey ? parentKey + "." + key : key)
            }
        }
        if (reflection.methods) {
            for (const key in reflection.methods) {
                this.methodsReflections[parentKey ? parentKey + "." + key : key] = reflection.methods[key]
            }
        }
        if (reflection.events) {
            for (const key in reflection.events) {
                this.eventsReflections[parentKey ? parentKey + "." + key : key] = reflection.events[key]
            }
        }
        if (reflection.parametricEvents) {
            for (const key in reflection.parametricEvents) {
                this.parametricEventsReflections[parentKey ? parentKey + "." + key : key] = reflection.parametricEvents[key]
            }
        }
    }
}