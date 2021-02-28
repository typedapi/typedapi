export interface Api {
    subApi: {
        someMethod(param: number): Promise<number>
    }
}