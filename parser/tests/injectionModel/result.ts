export interface Api {
    testInjectionMethod(): Promise<number>
    testInjectionMethod2(a: number): Promise<void>
    testInjectionMethod3(a?: number): Promise<void>
    testInjectionMethod4(a: number, b: number, c: number): Promise<boolean>
}