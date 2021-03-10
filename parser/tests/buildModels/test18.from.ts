interface A {
    b: number
}

const c = async (): Promise<A[]> => {
    return []
}

export class Api {
    async myMethod(a: number) {
        return c()
    }
}