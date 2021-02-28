import { NotConnectedError } from "../src"

describe("NotConnectedError", () => {
    it("test", () => {
        let err = new NotConnectedError()
        expect(err.message).toEqual("Not connected.")
    })
})