export interface Api {
    subApi: {
        /**
         * Method comment
         */
        someMethod(param: MethodParam): Promise<number>
    }
}
export interface MethodParam {
    a: string
    a1?: string
    b: number
    b1: number[]
    b2: number[]
    c: boolean
}