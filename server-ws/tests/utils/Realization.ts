import { default as API, BookResult, UpdateBook, BookFilter, BooksAPI, CreateBook, SomeApi, SomeApi1 } from "./Interface"
import { ClientError, RequestError, ServerError } from "typedapi-core"
import { BroadCastEvent, Event, ParametricEvent, Access, LogConfig, AuthData, ConnectionData, AuthDataResponse } from "typedapi-server"

interface StorageInterface {
    idIncrement: number
    books: Array<BookResult>
}

export class TestBooksApiError extends ClientError {
    constructor(message?: string) {
        super(message)
        Object.setPrototypeOf(this, TestBooksApiError.prototype)
    }
}

/**
 * Simple books api implementation with memory storage for testing purposes
 */
export class BooksApi implements BooksAPI {

    storage: StorageInterface = {
        idIncrement: 1,
        books: []
    }

    @LogConfig(true)
    async count(): Promise<number> {
        return this.storage.books.length
    }

    @LogConfig(false)
    async find(filter?: BookFilter, limit?: number, offset?: number): Promise<Array<BookResult>> {
        let returnValue: Array<BookResult> = []
        for (let book of this.storage.books) {
            if (filter!.description && book.description.indexOf(filter!.description!) === -1) {
                continue
            }
            if (filter!.title && book.title.indexOf(filter!.title!) === -1) {
                continue
            }
            returnValue.push(book)
        }
        return returnValue
    }

    @LogConfig("inputOnly")
    async get(id: number): Promise<BookResult> {
        for (let i = 0; i < this.storage.books.length; i++) {
            if (this.storage.books[i].id === id) {
                return this.storage.books[i]
            }
        }
        throw new Error(`Book #${id} not found`)
    }


    async update(id: number, data: UpdateBook): Promise<void> {
        for (let i = 0; i < this.storage.books.length; i++) {
            if (this.storage.books[i].id === id) {
                if (data.title) {
                    this.storage.books[i].title = data.title
                }
                if (data.description) {
                    this.storage.books[i].description = data.description
                }
                this.onUpdate.fire(this.storage.books[i])
                this.onBookUpdated.fire(this.storage.books[i], this.storage.books[i].id)
                return
            }
        }
    }

    async remove(id: number): Promise<void> {
        for (let i = 0; i < this.storage.books.length; i++) {
            if (this.storage.books[i].id === id) {
                this.storage.books.splice(i, 1)
                this.onDelete.fire(id)
                return
            }
        }
        throw new Error(`Book #${id} not found`)
    }

    @Access("manager")
    @LogConfig("outputOnly")
    async create(book: CreateBook): Promise<BookResult> {
        let newBook: BookResult = {
            id: this.storage.idIncrement,
            title: book.title,
            description: book.description
        }
        this.storage.idIncrement++
        this.storage.books.push(newBook)
        this.onCreate.fire(newBook)
        return newBook
    }

    onCreate = new Event<BookResult>()

    onUpdate = new Event<BookResult>()

    onDelete = new Event<number>()

    onBookUpdated = new ParametricEvent<BookResult, number, number>(
        (id1: number, data: BookResult, id2: number) => {
            return id1 === id2
        },
        async (params, authData) => {
            return params === 100 ? true : "params !== 100"
        }
    )

    someApi1 = new SomeApi1Realisation()
}

export class SomeApiRealisation implements SomeApi {
    async someMethod() {

    }
}

export class SomeApi1Realisation implements SomeApi1 {
    subApi = {
        someMethod: async () => {

        }
    }
}

export class Api implements API {
    books: BooksAPI = new BooksApi
    someApi: SomeApi = new SomeApiRealisation()
    someApi1: SomeApi1 = new SomeApi1Realisation()
    someMethod = async () => {
        return true
    }
    errorMethod = async () => {
        throw new TestBooksApiError("asd")
    }
    serverErrorMethod = async () => {
        throw new Error("asd")
    }
    @BroadCastEvent()
    broadCastEvent = new Event<number>()
    callBroadcastEvent = async (val: number) => {
        this.broadCastEvent.fire(val)
    }
    testEvent = new Event<number>()
    testParametricEvent = new ParametricEvent<number, number, number>(
        (id1: number, id2: number, d) => {
            return id1 === d
        }
    )
    async testInjectionMethod(apiUserId?: number): Promise<number | undefined> {
        return apiUserId
    }

    async testInjectionMethod2(a: number, apiUserId?: number): Promise<any> {
        return { a, apiUserId }
    }

    async testInjectionMethod3(a?: number, apiUserId?: number): Promise<any> {
        return { a, apiUserId }
    }

    async testInjectionMethod4(a: number, apiUserId: number, b: number, c: number): Promise<any> {
        return { a, apiUserId, b, c }
    }

    async testInjectionMethod5(a: number, apiUserId: number, b: number, c: number): Promise<any> {
        return { a, apiUserId, b, c }
    }

    async testInjectionMethod5x(): Promise<any> {
        return 1
    }    

    async testInjectionMethod6(apiUserId: number, apiAuthData: AuthData, apiConnectionData: ConnectionData): Promise<any> {
        return { apiUserId, apiAuthData, apiConnectionData }
    }

    async testInjectionMethod7(): Promise<AuthDataResponse> {
        return {
            newAuthData: {
                id: "new-id",
                groups: ["manager"],
            },
            response: true
        }
    }

    async logout(): Promise<AuthDataResponse> {
        return {
            newAuthData: {},
            response: true
        }
    }    

}