export interface SomeInterface {
    a: true
    b?: false
    c: 1 | 2 | "asd" | false
}

export class Api {
    async someMethod(): Promise<SomeInterface> {
        return {
            a: true,
            c: 1
        }
    }
}