export interface Api {
    myMethod(p: Param): Promise<number>
    myMethod2(p: Param): Promise<number>
    myMethod3(p: Param[]): Promise<number>
    myMethod4(p: Param[]): Promise<number>
}
export interface Param {
    a: string
    b: number
    p1: Param1
    p2: Param1[]
}
export interface Param1 {
    a: string
    x: Param2
}
export interface Param2 {
    a: boolean
    p4: Param3[]
    p5: Param4[]
}
export interface Param3 {
    a: number
}
export interface Param4 {
    a: number
}