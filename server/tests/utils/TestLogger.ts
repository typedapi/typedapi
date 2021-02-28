import { LoggerInterface } from "../../src/log"
import { ConnectionData } from "../../src/auth"

interface LogMethodCallsItem {
    method: string
    ms: number
    input: any
    output: any
    connectionData: ConnectionData
}

interface LogErrorMethodCallsItem {
    method: string
    input: any
    error: string
    connectionData: ConnectionData
}

interface EventsItem {
    event: string
    data: any
    connectionData?: ConnectionData
}

export class TestLogger implements LoggerInterface {

    logCalls: LogMethodCallsItem[] = []
    logErrorCalls: LogErrorMethodCallsItem[] = []
    logins: ConnectionData[] = []
    logouts: ConnectionData[] = []
    onlines: ConnectionData[] = []
    offlines: ConnectionData[] = []
    events: EventsItem[] = []

    methodCall(method: string, ms: number, input: any, output: any, connectionData: ConnectionData): void {
        this.logCalls.push({ method, ms, input, output, connectionData })
    }
    clientError(method: string, input: any, error: string, connectionData: ConnectionData): void {
        this.logErrorCalls.push({ method, input, error, connectionData })
    }
    serverError(method: string, input: any, error: string, connectionData: ConnectionData): void {
        this.logErrorCalls.push({ method, input, error, connectionData })
    }
    login(connectionData: ConnectionData): void {
        this.logins.push(connectionData)
    }
    logout(connectionData: ConnectionData): void {
        this.logouts.push(connectionData)
    }
    online(connectionData: ConnectionData): void {
        this.onlines.push(connectionData)
    }
    offline(connectionData: ConnectionData): void {
        this.offlines.push(connectionData)
    }
    event(event: string, data: any, connectionData?: ConnectionData): void {
        this.events.push({ event, data, connectionData })
    }

}