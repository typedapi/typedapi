import { LoggerInterface,LoggerServerStatusData } from "../../src/log"
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
    statusesData: LoggerServerStatusData[] = []

    methodCall(method: string, ms: number, input: any, output: any, connectionData: ConnectionData): void {
        this.logCalls.push({ method, ms, input, output, connectionData })
    }
    clientError(method: string, input: any, error: string, connectionData: ConnectionData): void {
        this.logErrorCalls.push({ method, input, error, connectionData })
    }
    serverError(method: string, input: any, error: string, connectionData: ConnectionData): void {
        this.logErrorCalls.push({ method, input, error, connectionData })
    }
    event(event: string, data: any, connectionData?: ConnectionData): void {
        this.events.push({ event, data, connectionData })
    }
    status(data: LoggerServerStatusData): void {
        this.statusesData.push(data)
    }

}