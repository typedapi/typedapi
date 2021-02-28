export interface Api {
    method(name?: string): Promise<number>
}