class Api2 {
    a = 10
    someMethod(param: number): Promise<number> {
        return Promise.resolve(1)
    }
}
export class Api {
    subApi = new Api2
}