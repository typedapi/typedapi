import { AuthDataResponse } from "typedapi-server"

export class Api {
    someMethod(): Promise<AuthDataResponse> {
        return Promise.resolve({
            response: true,
            newAuthData: {
                id: "newId"
            }
        })
    }
}