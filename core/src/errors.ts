/**
 * Shared errors that throws by Server and catching by Client
 */

/**
 * Base client error. Any client`s error should extend this class
 */
export class ClientError extends Error {

    constructor(message = "Error. Try again later.") {
        super(message)
        Object.setPrototypeOf(this, ClientError.prototype)
    }

    /**
     * Other error classes can override this method
     * to implement own serialisation logic
     */
    serialize(): unknown {
        return this.message
    }

    /**
     * Other error classes can override this method
     * to implement own restoring logic
     */    
    restore(data: unknown): void {
        if(typeof data === "string") {
            this.message = data
        }        
    }

}

/**
 * Request error. 
 * Throws if input data not validate e t.c.
 */
export class RequestError extends ClientError {
    constructor(message = "Request Error.") {
        super(message)
        Object.setPrototypeOf(this, RequestError.prototype)
    }
}

/**
 * Not authorized error
 * Throws if anonymous user try to access method that need authorization
 */
export class NotAuthorizedError extends ClientError {
    constructor(message = "Not authorized.") {
        super(message)
        Object.setPrototypeOf(this, NotAuthorizedError.prototype)
    }
}

/**
 * For server errors.
 * Will be returned even if server will throw unexpected error, without error data.
 */
export class ServerError extends ClientError {
    constructor(message = "Server error. Please try again later.") {
        super(message)
        Object.setPrototypeOf(this, ServerError.prototype)
    }
}

/**
 * Access denied error
 * Throws if anonymous user try to access method 
 * that he have no access (by group e t.c.)
 */
export class AccessDeniedError extends ClientError {
    constructor(message = "Access denied.") {
        super(message)
        Object.setPrototypeOf(this, ServerError.prototype)
    }
}

/**
 * Base errors is list of base errors that can be send it TypeScipt.
 * To implement own errors see ObjectProxy in documentation.
 */
export const getBaseErrorsList = (): { [key: string]: ClientErrorType } => {
    return {
        NotAuthorizedError,
        ServerError,
        RequestError,
        ClientError,
    }
}

/**
 * Just client error type
 */
export type ClientErrorType = {
    new(): ClientError
}