import { Event, ParametricEvent } from "../../src/events"

export interface BookResult {
    id: number
    title: string
    description: string
}

export interface UpdateBook {
    title?: string
    description?: string
}
export interface CreateBook {
    title: string
    description: string
}

export interface BookFilter {
    title?: string
    description?: string
}

export interface SomeApi {
    someMethod(): Promise<any>
}

export interface SomeApi1 {
    subApi: {
        someMethod(): Promise<any>
    }
}

/**
 * Simple books api for testing purposes
 */
export interface BooksAPI {

    count(): Promise<number>

    create(book: CreateBook): Promise<BookResult>

    find(filter?: BookFilter, limit?: number, offset?: number): Promise<Array<BookResult>>

    get(id: number): Promise<BookResult>

    update(id: number, data: UpdateBook): Promise<void>

    remove(id: number): Promise<void>

    onCreate: Event<BookResult>

    onUpdate: Event<BookResult>

    onDelete: Event<number>

    onBookUpdated: ParametricEvent<BookResult, number, number>    

    someApi1: SomeApi1

}

interface API {
    books: BooksAPI,
    someApi: SomeApi,
    someMethod(): Promise<any>
    errorMethod(): Promise<any>
    broadCastEvent: Event<number>
    callBroadcastEvent(val: number): Promise<void>    
    testEvent: Event<number>
    testParametricEvent: ParametricEvent<number,number,number>
    testInjectionMethod(): Promise<number | undefined>
}

export default API