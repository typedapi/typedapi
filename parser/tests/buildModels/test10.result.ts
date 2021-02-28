export interface Api {
    someMethod(): Promise<StringType>
    someMethod2(): Promise<SomeInterface>
}
export type StringType = "a" | "b" | "c"
export interface SomeInterface {
    t: StringType
}