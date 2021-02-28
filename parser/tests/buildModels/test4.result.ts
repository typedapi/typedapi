export interface Api {
    method(param: Param4): Promise<number>
}
export interface Param4 {
    d: string[]
    p: Param3[]
}
export interface Param3 {
    c: boolean
    p: Param2[]
}
export interface Param2 {
    b: string
    p: Param1
}
export interface Param1 {
    a: number
}