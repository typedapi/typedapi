export interface Api {
    myMethod(a: number): Promise<A[]>
}
export interface A {
    b: number
}