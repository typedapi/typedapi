import { ApiMap } from "typedapi-server"
import * as redis from "redis"

export interface RedisSubscriberConfig {
    apiMap: ApiMap
    redisOptions?: redis.ClientOpts
    nodeId?: string
    channel: string
}

export class RedisSubscriber {

    private subscriber?: redis.RedisClient
    private apiMap: ApiMap
    private nodeId?: string
    private channel: string

    constructor(config: RedisSubscriberConfig) {

        this.apiMap = config.apiMap
        this.channel = config.channel
        this.nodeId = config.nodeId

        this.subscriber = redis.createClient(config.redisOptions)
        this.subscriber.on("message", (channel, message) => this.processMessage(channel, message))
        this.subscriber.subscribe(this.channel)        

    }

    private processMessage(channel: string, message: string) {
        console.log(channel, message)
        const data = JSON.parse(message) as unknown[]
        if (this.nodeId && data[3] === this.nodeId) return
        const eventName = data[0] as string
        const eventInfo = this.apiMap.events.get(eventName)
        if(eventInfo) {
            eventInfo.event.fire(data[1])
        } else {
            const eventInfo = this.apiMap.parametricEvents.get(eventName)
            if(!eventInfo) {
                throw new Error("eventInfo not found")
            }
            eventInfo.event.fire(data[1], data[2])            
        }
    }
}