import {
    getBaseErrorsList,
    ClientErrorType,
    ClientError,
    ServerError,
    ServerErrorMessage,
} from "typedapi-core"

/**
 * Object proxy using for proxying objects between client and server
 */
export class ObjectProxy {

    constructor() {
        // Set default errors
        this.setErrors(getBaseErrorsList())
    }

    /**
     * Errors map (errorCode => ErrorClass)
     */
    private errors: Map<string, ClientErrorType> = new Map

    /**
     * Set custom errors
     * Add your errors on client and server to catch that error on client
     * @param errorsHash hash (errorCode:ErrorClass)
     */
    setErrors(errorsHash: { [errorCode: string]: ClientErrorType }): void {
        for (const code in errorsHash) {
            this.errors.set(code, errorsHash[code])
        }
    }

    /**
     * Get error class from error code
     */
    getErrorClass(code: string): ClientErrorType {
        return this.errors.get(code) ?? ServerError
    }

    /**
     * Get error instance from server`s error response
     */
    getErrorFromServerMessage(message: ServerErrorMessage): ClientError {
        const errorClass = this.getErrorClass(message[2])
        const returnValue = new errorClass()
        returnValue.restore(message[3])
        return returnValue
    }

}