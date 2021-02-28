export interface Api {
    someMethod(): Promise<SomeInterface>
    someMethod2(): Promise<Date>
    someMethod3(date: Date): Promise<void>
}
export interface SomeInterface {
    date: Date
}