import { ApiMap } from "typedapi-server"
import * as redis from "redis"
import { PublishDataType } from "./RedisPublisher"

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
        const data = JSON.parse(message) as PublishDataType
        if (this.nodeId && data[4] === this.nodeId) return

        const eventName = data[1]        
        const eventData = data[2]

        if(data[0] === "e") {
            const eventInfo = this.apiMap.events.get(eventName)
            if (!eventInfo) {
                throw new Error(`event '${eventName}' not found`)
            }        
            const event = eventInfo.event                       
            if(data[3]) {
                const meta = data[3]
                switch(meta[0]) {
                    case "u":
                        event.fireForUser(eventData, meta[1])        
                        break
                    case "c":
                        event.fireForConnection(eventData, meta[1])
                        break
                    case "g":
                        event.fireForGroup(eventData, meta[1])
                        break
                    case "s":
                        event.fireForSession(eventData, meta[1])
                        break
                }
            } else {
                event.fire(eventData)
            }                
        } else {
            const eventInfo = this.apiMap.parametricEvents.get(eventName)
            if (!eventInfo) {
                throw new Error(`event '${data[1]}' not found`)
            }
            eventInfo.event.fire(data[2], data[3])
        }
    }
}