import { TransportInterface, TransportConnectionStatus } from "../../src/TransportInterface"
import { CoreEvent } from "../../src/events"
import { ClientMessage, ServerMessage } from "typedapi-core"

export class TestTransport implements TransportInterface {
    sent: ClientMessage[] = []
    send(data: ClientMessage): Promise<any> {
        this.sent.push(data)
        return Promise.resolve()
    }
    getLastSent(): any {
        return this.sent.length ? this.sent[this.sent.length - 1] : [0, "", []]
    }
    onMessage: CoreEvent<ServerMessage> = new CoreEvent
    getConnectionStatus(): TransportConnectionStatus {
        return "connected"
    }
    connectionStatusChanged: CoreEvent<TransportConnectionStatus> = new CoreEvent
}