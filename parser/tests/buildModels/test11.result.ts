export interface Api {
    someMethod(): Promise<IndexedObjectInterface>
}
export interface IndexedObjectInterface {
    [key: string]: SomeInterface
}
export interface SomeInterface {
    a: string
}