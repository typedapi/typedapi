class A {
    a = 10
}

interface B {
    a: A
}

export class Api {
    myMethod(b: B): Promise<number> {
        return Promise.resolve(b.a.a)
    }
}