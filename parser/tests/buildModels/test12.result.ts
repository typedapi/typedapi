export interface Api {
    someMethod(): Promise<SomeInterface>
}
export interface SomeInterface {
    a: true
    b?: false
    c: 1 | 2 | "asd" | false
}