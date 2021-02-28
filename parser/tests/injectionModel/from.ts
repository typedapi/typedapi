import { AuthDataResponse } from "typedapi-server"
export class Api {
    async testInjectionMethod(apiUserId?: number): Promise<number> {
        return 1
    }

    async testInjectionMethod2(a: number, apiUserId?: number): Promise<void> {
    }

    async testInjectionMethod3(a?: number, apiUserId?: number): Promise<void> {
    }

    testInjectionMethod4(a: number, apiUserId: number, b: number, c: number): Promise<AuthDataResponse> {
        return Promise.resolve({
            response: true,
            newAuthData: {
                id: "newId"
            }
        })
    }
}