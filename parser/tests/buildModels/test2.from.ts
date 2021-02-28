interface MethodParam {
    a: string
    b: number
    c: boolean
    a1?: string
    b1: number[]
    b2: Array<number>
}
export class Api {
    subApi = {
        /**
         * Method comment
         */
        someMethod: (param: MethodParam): Promise<number> => {
            return Promise.resolve(1)
        }
    }
    protected async protectedMethod(): Promise<any> {
        this.privateMethod()
    }
    private async privateMethod(): Promise<any> {

    }
}