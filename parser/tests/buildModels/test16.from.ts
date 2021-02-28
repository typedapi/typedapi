export type A = [
    "a",
    number,
    string
]

export type B = [
    "b",
    string,
    number
]

export type C = A | B

export class Api {
    someMethod(): Promise<C> {
        return Promise.resolve(["a", 0, ""])
    }
}