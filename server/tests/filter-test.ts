import { filterIn, filterOut, filterMethod, filterOutFast } from "../src/filter"
import { TupleReflection, TypeReflection } from "typedapi-core"

type rec = Record<string, unknown>

const testReflection: TypeReflection = {
    type: "object",
    children: {
        str: {
            type: "string"
        },
        num: {
            type: "number"
        }
    }
}

describe("Filter type", () => {
    it("filterTypeBase", () => {
        let filtered = filterIn({
            str: "",
            num: 1,
            abc: 123
        }, testReflection)
        expect((filtered as rec).abc).toBeUndefined()
        expect((filtered as rec).num).toEqual(1)
    })
    it("filterDate", () => {
        let date = "2020-11-25T09:26:52.062Z"
        expect((filterIn(date, { type: "Date" }) as Date).toISOString()).toEqual(date)
        expect(filterOut(new Date(date), { type: "Date" })).toEqual(date)
    })
    it("filterArray", () => {
        let filtered = filterIn([{
            str: "",
            num: 1,
            abc: 123
        }, {
            str: "",
            num: 1,
            abc: 123
        }], {
            type: "Array",
            arrayElementType: testReflection
        })
        expect((filtered as rec[])[0].abc).toBeUndefined()
        expect((filtered as rec[])[0].num).toEqual(1)
        expect((filtered as rec[])[1].abc).toBeUndefined()
        expect((filtered as rec[])[1].num).toEqual(1)
    })
    it("indObj", () => {
        let filtered = filterIn({
            a: {
                str: "asd",
                num: 20,
                a: 1
            }
        }, {
            type: "indObj",
            keyType: "string",
            valueType: testReflection,
        })
        const a = (filtered as rec).a as rec
        expect(a.str).toEqual("asd")
        expect(a.num).toEqual(20)
        expect(a.a).toBeUndefined()
    })
    it("union", () => {
        let refl: TypeReflection = {
            type: "union",
            unionTypes: [{ type: "string" }, testReflection]
        }
        let filtered = filterIn("asd", refl) as any
        expect(filtered).toEqual("asd")
        filtered = filterIn({ str: "asd", num: 20, a: 1 }, refl)
        expect((filtered as rec).str).toEqual("asd")
        expect((filtered as rec).num).toEqual(20)

        filtered = filterOut({ str: "asd", num: 10 }, refl) as any
        expect(filtered.str).toEqual("asd")
        expect(filtered.num).toEqual(10)

        filtered = filterOut("asd", refl) as any
        expect(filtered).toEqual("asd")

        expect(() => filterOut(1, refl)).toThrow()

        filtered = filterOutFast({ str: "asd", num: 10 }, refl) as any
        expect(filtered.str).toEqual("asd")
        expect(filtered.num).toEqual(10)

        filtered = filterOutFast("asd", refl) as any
        expect(filtered).toEqual("asd")

        expect(() => filterOutFast(1, refl)).toThrow()        


    })
    it("return zero", () => {
        let refl: TypeReflection = {
            type: "number"
        }
        let filtered = filterIn(0, refl)
        expect(filtered).toEqual(0)
    })
    it("tuples", () => {
        let refl: TupleReflection = {
            type: "Tuple",
            tupleTypes: [{
                type: "number"
            }, {
                type: "string"
            }]
        }
        let filtered = filterIn([0, "1"], refl)
        expect((filtered as rec[])[0]).toEqual(0)
        expect((filtered as rec[])[1]).toEqual("1")
    })
    it("filterOutFast", () => {
        let filtered = filterOutFast(undefined, { type: "number", optional: true })
        expect(filtered).toBeUndefined()

        filtered = filterOutFast([1, 2], { type: "Array", arrayElementType: { type: "number" } })
        expect((filtered as rec)[1]).toEqual(2)

        filtered = filterOutFast({ a: 1, b: 2 }, { type: "indObj", valueType: { type: "number" }, keyType: "string" })
        expect((filtered as rec).b).toEqual(2)
    })
    it("filterOut", () => {
        let filtered = filterOut(undefined, { type: "number", optional: true })
        expect(filtered).toBeUndefined()

        filtered = filterOut([1, 2], { type: "Array", arrayElementType: { type: "number" } })
        expect((filtered as rec)[1]).toEqual(2)

        filtered = filterOut({ a: 1, b: 2 }, { type: "indObj", valueType: { type: "number" }, keyType: "string" })
        expect((filtered as rec).b).toEqual(2)

        expect(() => filterOut({}, { type: "number" })).toThrow()
        expect(() => filterOut(Number.NaN, { type: "number" })).toThrow()
        expect(() => filterOut(10, { type: "Enum", maxIndex: 3 })).toThrow()

        let arr = [1, "1", "true", "y", "yes", true]
        arr.forEach(v => expect(filterOut(v, { type: "boolean" })).toBeTruthy())

        expect(filterOut(0, { type: "boolean" })).toBeFalsy()

        expect(filterOut(1, { type: "undefined" })).toBeUndefined()

        expect(filterOut(1, { type: "null" })).toBeNull()

        expect(() => filterOut(1, { type: "unknown" })).toThrow()

        expect(filterOut(1, { type: "string" })).toEqual("1")

        expect(() => filterOut({}, { type: "string" })).toThrow()

    })
})

describe("Filter method", () => {
    it("Filter method", () => {
        let filtered = filterMethod([{
            str: "",
            num: 1,
            abc: 123
        }], {
            params: [
                testReflection,
                { type: "number" }
            ]
        })
        expect((filtered as rec[])[0].abc).toBeUndefined()
        expect((filtered as rec[])[0].num).toEqual(1)
    })

    it("Filter empty", () => {
        expect(filterMethod([], {
            generator: undefined
        }).length).toEqual(0)
    })
})