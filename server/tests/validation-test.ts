import { validate, validateMethod } from "../src/validation"
import {
    TypeReflection,
    MethodReflection,
} from "typedapi-core"

const testReflection: TypeReflection = {
    type: "object",
    children: {
        str: {
            type: "string"
        },
        num: {
            type: "number"
        },
        optNum: {
            type: "number",
            optional: true
        },
        arr: {
            type: "Array",
            arrayElementType: {
                type: "number"
            },
            optional: true
        },
        optBool: {
            type: "boolean",
            optional: true
        },
        optDate: {
            type: "Date",
            optional: true
        },
        optObject: {
            type: "object",
            optional: true,
            children: {
                num: {
                    type: "number"
                }
            }
        }
    }
}

const testMethodReflection: MethodReflection = {
    params: [testReflection]
}


describe("Validation test", () => {
    it("Base validation success", () => {
        let data: any = {
            str: "",
            num: 0,
            arr: [1, 2],
            optAny: 1,
            optUnknown: 1
        }
        expect(validate(testReflection, data)).toBeTruthy()
    })
    it("Wrong without required property", () => {
        let data: any = {
            str: "",
            arr: []
        }
        expect(validate(testReflection, data) === true).toBeFalsy()
    })
    it("Array bad field", () => {
        let data: any = {
            str: "",
            num: 0,
            arr: [""]
        }
        expect(validate(testReflection, data) === true).toBeFalsy()
    })
    it("No array", () => {
        let data: any = {
            str: "",
            num: 0,
            arr: ""
        }
        expect(validate(testReflection, data) === true).toBeFalsy()
    })
    it("bool", () => {
        let data: any = {
            str: "",
            num: 0,
            optBool: true
        }
        expect(validate(testReflection, data) === true).toBeTruthy()

        let data1: any = {
            str: "",
            num: 0,
            optBool: 123
        }
        expect(validate(testReflection, data1) === true).toBeFalsy()
    })

    it("some wrong", () => {
        expect(validate(testReflection, null) === true).toBeFalsy()
        expect(validate(testReflection, {
            str: ""
        }) === true).toBeFalsy()
        let res = validate(testReflection, {
            str: "",
            num: 0,
            abc: 123
        })
        expect(res === true).toBeFalsy()

        let res1 = validate(testReflection, {
            str: "",
            num: 0,
            optObject: {
                num: 1,
                abc: 123
            }
        })
        expect(res1 === true).toBeFalsy()
    })

    it("Date", () => {
        expect(validate(testReflection, {
            str: "",
            num: 0,
            optDate: "2020-11-25T09:26:52.062Z"
        }) === true).toBeTruthy()

        expect(validate(testReflection, {
            str: "",
            num: 0,
            optDate: "oops"
        }) === true).toBeFalsy()

        expect(validate(testReflection, {
            str: "",
            num: 0,
            optDate: 123
        }) === true).toBeFalsy()
    })

    it("Method", () => {
        expect(validateMethod(testMethodReflection, [{
            str: "",
            num: 0
        }], "") === true).toBeTruthy()

        expect(validateMethod(testMethodReflection, 1 as unknown as any[], "") === true).toBeFalsy()

        expect(validateMethod(testMethodReflection, [{
            str: "",
            num: 0
        }, 123], "") === true).toBeFalsy()

        expect(validateMethod({}, [123], "") === true).toBeFalsy()
        expect(validateMethod({}, [], "") === true).toBeTruthy()

        expect(validateMethod({
            params: [testReflection, {
                type: "number",
                optional: true
            }]
        }, [{
            str: "",
            num: 0
        }], "") === true).toBeTruthy()

        expect(validateMethod({
            params: [testReflection, {
                type: "number",
                optional: true
            }]
        }, [{
            str: "",
            num: "123"
        }], "") === true).toBeFalsy()

        let res = validateMethod({
            params: [testReflection, {
                type: "number",
                optional: true
            }]
        }, [{
            str: "",
            num: 1,
            optObject: {
                num: 1,
                abc: 123
            }
        }], "")
        expect(res === true).toBeFalsy()
    })

    it("union and value type", () => {
        let refl: TypeReflection = {
            type: "union",
            unionTypes: [{
                type: "value",
                value: "asd"
            }, {
                type: "value",
                value: "qwe"
            }]
        }
        expect(validate(refl, "asd") === true).toBeTruthy()
        expect(validate(refl, "qwe") === true).toBeTruthy()
        expect(validate(refl, "zxc") === true).toBeFalsy()
        expect(validate({ type: "union", unionTypes: [] }, 1) === true).toBeFalsy()
    })

    it("indexed Object", () => {
        let refl: TypeReflection = {
            type: "indObj",
            keyType: "string",
            valueType: {
                type: "number"
            }
        }
        expect(validate(refl, { a: 10, b: 20 }) === true).toBeTruthy()
        expect(validate(refl, { a: 10, b: "asd" }) === true).toBeFalsy()
        expect(validate(refl, "xyz") === true).toBeFalsy()

        let refl1: TypeReflection = {
            type: "indObj",
            keyType: "string",
            valueType: {
                type: "object",
                children: {
                    a: {
                        type: "string"
                    }
                }
            }
        }

        expect(validate(refl1, { a: { a: "asd", b: 10 } }) === true).toBeFalsy()
        expect(validate(refl1, { a: { a: "asd" }, b: { a: "asd2" } }) === true).toBeTruthy()

        refl = {
            type: "indObj",
            keyType: "number",
            valueType: {
                type: "string"
            }
        }

        expect(validate(refl, { "1": "asd", "2": "asd2" }) === true).toBeTruthy()
        expect(validate(refl, { "1": "asd", "asd": "asd2" }) === true).toBeFalsy()
    })

    it("Array", () => {
        expect(validate({ type: "Array", arrayElementType: { type: "number" } }, [1, 1])).toBeTruthy()
    })

    it("Enum", () => {
        let refl: TypeReflection = {
            type: "Enum",
            maxIndex: 3
        }
        expect(validate(refl, 1) === true).toBeTruthy()
        expect(validate(refl, 5) === true).toBeFalsy()
        expect(validate(refl, Number.NaN) === true).toBeFalsy()
        expect(validate(refl, "as") === true).toBeFalsy()
    })

    it("Tuple", () => {
        let refl: TypeReflection = {
            type: "Tuple",
            tupleTypes: [
                { type: "string" },
                { type: "null" },
                { type: "undefined" },
                { type: "string", optional: true }
            ]
        }
        expect(validate(refl, 5) === true).toBeFalsy()
        expect(validate(refl, ["123", null, undefined, "123"]) === true).toBeTruthy()
        expect(validate(refl, ["123", null, undefined, "123", "x"]) === true).toBeFalsy()

        expect(validate(refl, ["123", 1, undefined, "123"]) === true).toBeFalsy()
        expect(validate(refl, ["123", null, 2, "123"]) === true).toBeFalsy()
    })

    it("any", () => {
        let refl: TypeReflection = {
            type: "unknown"
        }
        expect(validate(refl, 1, undefined, true) === true).toBeTruthy()
        expect(() => validate(refl, 1)).toThrow()
    })

    it("bad type", () => {
        expect(() => validate({ type: "injection", injectionType: "" }, 1)).toThrow()
    })
})
