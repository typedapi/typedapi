export type StringType = "a" | "b" | "c"
export interface SomeInterface {
    t: StringType
}

export class Api {
    async someMethod(): Promise<StringType> {
        return "a"
    }
    async someMethod2(): Promise<SomeInterface> {
        return {
            t: "a"
        }
    }
}