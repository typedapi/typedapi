import {
    getBaseErrorsList,
    ClientErrorType,
    ClientError,
    ServerError,
    ServerErrorMessage,
} from "typedapi-core"
import { LoggerInterface } from "./log"
import { ConnectionData } from "./auth"

/**
 * Object proxy using for proxying objects between client and server
 */
export class ObjectProxy {

    constructor() {
        // Set default errors
        this.setErrors(getBaseErrorsList())
    }

    /**
     * Errors map (ErrorClass => errorCode)
     */
    private errors: Map<ClientErrorType, string> = new Map

    /**
     * Set custom errors
     * Add your errors on client and server to catch that error on client
     * @param errorsHash hash (errorCode:ErrorClass)
     */
    setErrors(errorsHash: { [errorCode: string]: ClientErrorType }): void {
        for (const code in errorsHash) {
            this.errors.set(errorsHash[code], code)
        }
    }

    /**
     * Get error code from error instance
     * @param err error instance
     */
    getErrorCode(err: ClientError): string {
        const code = this.errors.get(Object.getPrototypeOf(err).constructor)
        if (!code) {
            return "ServerError"
        }
        return code
    }

    /**
     * Get error class from error code
     * @param err error instance
     */
    getErrorClass(code: string): ClientErrorType {
        let returnValue: ClientErrorType = ServerError
        this.errors.forEach((value, key) => {
            if (value === code) {
                returnValue = key
                return false
            }
        })
        return returnValue
    }

    /**
     * Create server response from error
     * Specific logic for ClientError`s
     */
    responseFromError(data: ResponseFromErrorData): ServerErrorMessage {

        const err = data.err as Record<string, unknown>

        if (err instanceof ServerError) {
            data.logger && data.logger.serverError(
                data.method ?? "no method",
                data.input,
                err.message + "\n" + err.stack,
                data.connectionData)
            return ["er", data.requestId, "ServerError", {}]

        } else if (err instanceof ClientError) {
            data.logger && data.logger.clientError(
                data.method ?? "no method",
                data.input,
                err.message + "\n" + err.stack,
                data.connectionData)
            return ["er", data.requestId, this.getErrorCode(err), err.serialize()]

        } else if (err instanceof Error) {
            data.logger && data.logger.serverError(
                data.method ?? "no method",
                data.input,
                err.message + "\n" + err.stack,
                data.connectionData)
            return ["er", data.requestId, "ServerError", {}]

        } else {
            data.logger && data.logger.serverError(
                data.method ?? "no method",
                data.input,
                err.message + "\n" + err.stack,
                data.connectionData)
            return ["er", data.requestId, "ServerError", {}]
        }

    }
}

/**
 * Data for 'responseFromError' method
 */
interface ResponseFromErrorData {

    /**
     * Error instance
     */
    err: unknown

    /**
     * Connection data
     */
    connectionData: ConnectionData

    /**
     * request id
     */
    requestId: number

    /**
     * Method name
     */
    method?: string

    /**
     * Request input
     */
    input?: unknown

    /**
     * Logger instance
     */
    logger?: LoggerInterface

}