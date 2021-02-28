export interface Interface1 {
    a: number
}

export interface SomeInterface {
    nums: number[][]
    strs: string[][]
    abs: Array<Array<Array<Array<Interface1>>>>
}

export class Api {
    async someMethod(): Promise<SomeInterface> {
        return {
            nums: [],
            strs: [],
            abs: []
        }
    }
}