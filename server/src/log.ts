import { ConnectionData } from "./auth"
import { UsageStatusInterface } from "./getUsageStatus"

/**
 * Logger interface for TypedAPI loggers
 */
export interface LoggerInterface {
    methodCall(method: string, ms: number, input: unknown, output: unknown, connectionData: ConnectionData): void
    clientError(method: string, input: unknown, error: string, connectionData: ConnectionData): void
    serverError(method: string, input: unknown, error: string, connectionData: ConnectionData): void
    event(event: string, data: unknown, connectionData?: ConnectionData): void
    status(data: LoggerServerStatusData): void
}

/**
 * Log current server status
 */
export interface LoggerServerStatusData {
    usersOnline: number
    usage: UsageStatusInterface
}

/**
 * Logger for log api calls to string functions
 * For console create like
 * new TextLogger(console.log, console.error)
 */
export class TextLogger implements LoggerInterface {

    constructor(
        private logFunction: { (val: string): void },
        private logErrorFunction: { (val: string): void },
    ) { }

    methodCall(method: string, ms: number, input: unknown, output: unknown, connectionData: ConnectionData): void {
        const inputString = input ? `, input: ${JSON.stringify(input)}` : ""
        const outputString = output ? `, output: ${JSON.stringify(output)}` : ""
        this.logFunction(`${this.dateString()}${method}, ${ms}ms,${this.connString(connectionData)}${inputString}${outputString}`)
    }

    clientError(method: string, input: unknown, error: string, connectionData: ConnectionData): void {
        const inputString = input ? `, input: ${JSON.stringify(input)}` : ""
        this.logErrorFunction(`${this.dateString()}Client error ${method},${this.connString(connectionData)}${inputString}, Error: ${error}`)
    }

    serverError(method: string, input: unknown, error: string, connectionData: ConnectionData): void {
        const inputString = input ? `, input: ${JSON.stringify(input)}` : ""
        this.logErrorFunction(`${this.dateString()}Server error ${method},${this.connString(connectionData)}${inputString}, Error: ${error}`)
    }

    event(event: string, data: unknown, connectionData?: ConnectionData): void {
        this.logFunction(`${this.dateString()}${event}${this.connString(connectionData)}${data ? " " + JSON.stringify(data) : ""}`)
    }

    status(data: LoggerServerStatusData): void {
        this.logFunction(`${this.dateString()}Users online: ${data.usersOnline}; Usage: cpu ${data.usage.cpu}%, mem ${data.usage.memory}%, drive ${data.usage.drive}%`)
    }

    private connString(cd?: ConnectionData): string {
        if (!cd) return ""
        let returnValue = ` ip:${cd.ip}`
        if (cd.sessionId) returnValue += ` sid:${cd.sessionId}`
        //if (cd.connectionId) returnValue += ` cid:${cd.connectionId}`
        if (cd.authData.id) {
            returnValue = ` id:${cd.authData.id}` + returnValue
        } else {
            returnValue = " anon" + returnValue
        }
        return returnValue
    }

    private dateString() {
        return `[${(new Date).toISOString()}]: `
    }

}

export class NullLogger implements LoggerInterface {
    methodCall(): void { "" }
    clientError(): void { "" }
    serverError(): void { "" }
    event(): void { "" }
    status(): void { "" }
}