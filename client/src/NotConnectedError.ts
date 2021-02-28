/**
 * That error throws when connection fail
 */
export class NotConnectedError extends Error {
    constructor(message = "Not connected.") {
        super(message)
        Object.setPrototypeOf(this, NotConnectedError.prototype)
    }
}