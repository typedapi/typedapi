import { ApiMap, EventCallbackMetadata } from "typedapi-server"
import * as redis from "redis"

export interface RedisPublisherConfig {
    apiMap: ApiMap
    redisOptions?: redis.ClientOpts
    nodeId?: string
    channel: string
}

export type PublishDataType =
    // simple event:  ["e", eventName, data, callbackMetadata, nodeId]
    ["e", string, unknown, EventCallbackMetadata?, string?]
    // parametric event ["p", eventName, data, parameters, nodeId]
    | ["p", string, unknown, unknown?, string?]

export class RedisPublisher {

    private publisher?: redis.RedisClient
    private apiMap: ApiMap
    private channel: string
    private nodeId?: string

    constructor(config: RedisPublisherConfig) {
        this.apiMap = config.apiMap
        this.channel = config.channel
        this.publisher = redis.createClient(config.redisOptions)
        this.nodeId = config.nodeId
        this.subscribeToEvents(this.publisher)
    }

    private subscribeToEvents(publisher: redis.RedisClient) {
        this.apiMap.events.forEach((eventInfo, eventName) => {
            eventInfo.event.subscribe((data, meta) => {
                const publishData: PublishDataType = [
                    "e",
                    eventName,
                    data,
                    meta
                ]
                if (this.nodeId) publishData.push(this.nodeId)
                publisher.publish(this.channel, JSON.stringify(publishData))
            })
        })
        this.apiMap.parametricEvents.forEach((eventInfo, eventName) => {
            eventInfo.event.subscribe((data, parameters) => {
                const publishData: PublishDataType = parameters === undefined
                    ? ["p", eventName, data]
                    : ["p", eventName, data, parameters]
                if (this.nodeId) publishData.push(this.nodeId)
                publisher.publish(this.channel, JSON.stringify(publishData))
            })
        })
    }
}