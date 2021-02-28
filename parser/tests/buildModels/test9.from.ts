interface Param4 {
    a: number
}
interface Param3 {
    a: number
}
interface Param2 {
    a: boolean
    p4: Param3[]
    p5: Array<Param4>
}
interface Param1 {
    a: string
    x: Param2
}
interface Param {
    a: string
    b: number
    p1: Param1
    p2: Param1[]
}
export class Api {
    myMethod(p: Param): Promise<number> {
        return Promise.resolve(1)
    }
    myMethod2(p: Param): Promise<number> {
        return Promise.resolve(1)
    }
    myMethod3(p: Param[]): Promise<number> {
        return Promise.resolve(1)
    }
    myMethod4(p: Array<Param>): Promise<number> {
        return Promise.resolve(1)
    }
}