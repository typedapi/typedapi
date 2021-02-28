interface SomeInterface {
    date: Date
}

export class Api {
    someMethod(): Promise<SomeInterface> {
        return Promise.resolve({
            date: new Date
        })
    }
    someMethod2(): Promise<Date>{
        return Promise.resolve(new Date)
    }
    someMethod3(date: Date): Promise<void> {
        return Promise.resolve()
    }
}