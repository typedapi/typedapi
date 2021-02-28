import {
    ClientError,
    RequestError,
    NotAuthorizedError,
    ServerError,
    getBaseErrorsList,
    AccessDeniedError,
} from "../src/errors"

describe("Errors", () => {
    it("ClientError", () => {
        let err = new ClientError("my error")
        let serialized = err.serialize()
        let newErr = new ClientError()
        newErr.restore(serialized)
        expect(newErr.message).toEqual("my error")
        newErr.restore({})
        expect(newErr.message).toEqual("my error")
    })
    it("other", () => {
        new RequestError("message")
        new NotAuthorizedError("message")
        new ServerError("message")
        new AccessDeniedError("message")

        new ServerError()
        new RequestError()
        new NotAuthorizedError()
        new ClientError()
        new AccessDeniedError()
    })
    it("getBaseErrorsList", () => {
        let errorList = getBaseErrorsList()
        expect(errorList.ClientError).toEqual(ClientError)
    })
})