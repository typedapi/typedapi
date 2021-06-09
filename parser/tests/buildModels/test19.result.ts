export interface Api {
    myMethod(param: B): Promise<B>
}
export type B = {
    [key: string]: TypeA
}
export type TypeA = {
    a: number
}