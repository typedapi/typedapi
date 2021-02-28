import { ConnectionData } from "./auth"

/**
 * Logger interface for TypedAPI loggers
 */
export interface LoggerInterface {
    methodCall(method: string, ms: number, input: unknown, output: unknown, connectionData: ConnectionData): void
    clientError(method: string, input: unknown, error: string, connectionData: ConnectionData): void
    serverError(method: string, input: unknown, error: string, connectionData: ConnectionData): void
    login(connectionData: ConnectionData): void
    logout(connectionData: ConnectionData): void
    online(connectionData: ConnectionData): void
    offline(connectionData: ConnectionData): void
    event(event: string, data: unknown, connectionData?: ConnectionData): void
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
        const userIdString = connectionData.authData.id ? `user ${connectionData.authData.id}` : "anonymous"
        this.logFunction(`${this.getDate()}: ${method}, ${ms}ms, ${connectionData.ip}, ${userIdString}${inputString}${outputString}`)
    }

    clientError(method: string, input: unknown, error: string, connectionData: ConnectionData): void {
        const inputString = input ? `, input: ${JSON.stringify(input)}` : ""
        const userIdString = connectionData.authData.id ? `user ${connectionData.authData.id}` : "anonymous"
        this.logErrorFunction(`${this.getDate()}: Client error ${method}, ${connectionData.ip}, ${userIdString}${inputString}, Error: ${error}`)
    }

    serverError(method: string, input: unknown, error: string, connectionData: ConnectionData): void {
        const inputString = input ? `, input: ${JSON.stringify(input)}` : ""
        const userIdString = connectionData.authData.id ? `user ${connectionData.authData.id}` : "anonymous"
        this.logErrorFunction(`${this.getDate()}: Server error ${method}, ${connectionData.ip}, ${userIdString}${inputString}, Error: ${error}`)
    }

    login(connectionData: ConnectionData): void {
        this.logFunction(`${this.getDate()}: login user ${connectionData.authData.id}, ${connectionData.ip}`)
    }

    logout(connectionData: ConnectionData): void {
        this.logFunction(`${this.getDate()}: logout user ${connectionData.authData.id}, ${connectionData.ip}`)
    }

    online(connectionData: ConnectionData): void {
        const userIdString = connectionData.authData.id ? `${connectionData.authData.id}` : "anonymous"
        this.logFunction(`${this.getDate()}: online user ${userIdString}, ${connectionData.ip}`)
    }

    offline(connectionData: ConnectionData): void {
        const userIdString = connectionData.authData.id ? `${connectionData.authData.id}` : "anonymous"
        this.logFunction(`${this.getDate()}: offline user ${userIdString}, ${connectionData.ip}`)
    }

    event(event: string, data: unknown): void {
        this.logFunction(`${this.getDate()}: event ${event}${data ? " " + JSON.stringify(data) : ""}`)
    }

    private getDate(): string {
        return (new Date).toISOString()
    }

}

export class NullLogger implements LoggerInterface {
    methodCall(): void { "" }
    clientError(): void { "" }
    serverError(): void { "" }
    login(): void { "" }
    logout(): void { "" }
    online(): void { "" }
    offline(): void { "" }
    event(): void { "" }
}