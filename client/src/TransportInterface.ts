import { CoreEvent } from "./events"
import { ServerMessage, ClientMessage } from "typedapi-core"

/**
 * Transport connecion status
 * status "outdatedVersion" set when client api version not match with server api version
 */
export type TransportConnectionStatus = "connected" | "connecting" | "disconnected" | "outdatedVersion"

/**
 * Transport interface for all transports (HTTP, WebSocket)
 */
export interface TransportInterface {

    /**
     * Send message to server
     */
    send(data: ClientMessage): Promise<unknown>

    /**
     * Fires when client receive some data
     */
    onMessage: CoreEvent<ServerMessage>

    /**
     * Get connection status 
     */
    getConnectionStatus(): TransportConnectionStatus

    /**
     * Fired when connection status changes
     */
    connectionStatusChanged: CoreEvent<TransportConnectionStatus>
}