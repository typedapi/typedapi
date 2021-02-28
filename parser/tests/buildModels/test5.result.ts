export interface Api {
    method(): Promise<{ id: number, name?: string }[]>
    method2(): Promise<{ id: number, name: string, tags: string[] }[]>
}