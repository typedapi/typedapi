export class Api {
    method(): Promise<Array<{ id: number, name?: string }>> {
        return Promise.resolve([])
    }
    method2(): Promise<{ id: number, name: string, tags: string[] }[]> {
        return Promise.resolve([])
    }
}