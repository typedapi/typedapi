export interface SomeInterface {
    a: string
}

export interface IndexedObjectInterface {
    [key: string]: SomeInterface
}

export class Api {
    async someMethod(): Promise<IndexedObjectInterface> {
        return {}
    }
}