import { isApiClientMessageInterface } from "../src"

describe("clientDataReflections", () => {
    it("isApiClientMessageInterface", () => {
        expect(isApiClientMessageInterface([1, "asd", 0])).toBeTruthy()
        expect(isApiClientMessageInterface("")).toBeFalsy()
    })
})