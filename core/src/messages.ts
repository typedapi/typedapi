/**
 * Types for messages that client and server sending between them
 */

/**
 * ClientMessage is message from client
 * items:
 * - requestId: number
 * - method: string
 * - requestData: any
 */
export type ClientMessage = [
    number,
    string,
    unknown?,
]

/**
 * Server message is message from Server
 * It is union of types 
 * ServerErrorMessage, ServerMethodResponseMessage, ServerSystemMessage, ServerEventMessage
 */
export type ServerMessage =
    ServerErrorMessage
    | ServerMethodResponseMessage
    | ServerSystemMessage
    | ServerEventMessage

/**
 * ServerError is error response to user`s method request
 * items:
 * - "er": constant type alias
 * - requestId: number
 * - errorCode: string
 * - errorData: any
 */
export type ServerErrorMessage = [
    "er",
    number,
    string,
    unknown,
];

/**
 * ServerMethodResponse is response from server to user`s method request
 * items:
 * - "er": constant type alias
 * - requestId: number
 * - errorCode: string
 * - errorData: any
 */
export type ServerMethodResponseMessage = [
    "r",
    number,
    unknown?,
]

/**
 * SystemData is data that can be sent by server for system purposes
 * items:
 * - "sys": constant type alias
 * - SystemData: {
 *      setSessionId?: string
 *      setConnectionId?: string
 *  }
 */
export type ServerSystemMessage = [
    "sys",
    {
        // for setting session
        setSessionId?: string
        // for setting connection id (used in http server)
        setConnectionId?: string
        // extra data
        [key: string]: unknown
    },
]

/**
 * Event message
 * items:
 * - "ev": constant type alias
 * - eventName: string
 * - eventData: any
 * - subscriptionId: number?
 */
export type ServerEventMessage = [
    "ev",
    string,
    unknown?,
    number?,
]
