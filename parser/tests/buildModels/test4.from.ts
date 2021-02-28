interface Param1 {
    a: number
}
interface Param2 {
    b: string
    p: Param1
}
interface Param3 {
    c: boolean
    p: Param2[]
}
interface Param4 {
    d: string[]
    p: Array<Param3>
}
export class Api {
    method(param: Param4): Promise<number> {
        return Promise.resolve(1)
    }
}