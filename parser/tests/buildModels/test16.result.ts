export interface Api {
    someMethod(): Promise<C>
}
export type C = A | B
export type A = ["a", number, string]
export type B = ["b", string, number]