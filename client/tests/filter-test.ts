import { filter } from "../src/filter"
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
        let filtered = filter({
            str: "",
            num: 1,
            abc: 123
        }, testReflection, "out")
        expect((filtered as rec).abc).toBeUndefined()
        expect((filtered as rec).num).toEqual(1)
    })
    it("filterDate", () => {
        let date = "2020-11-25T09:26:52.062Z"
        expect((filter(date, { type: "Date" }, "in") as Date).toISOString()).toEqual(date)
        expect(filter(new Date(date), { type: "Date" }, "out")).toEqual(date)
    })
    it("filterArray", () => {
        let filtered = filter([{
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
        }, "out")
        expect((filtered as rec[])[0].abc).toBeUndefined()
        expect((filtered as rec[])[0].num).toEqual(1)
        expect((filtered as rec[])[1].abc).toBeUndefined()
        expect((filtered as rec[])[1].num).toEqual(1)
    })
    it("indObj", () => {
        let filtered = filter({
            a: {
                str: "asd",
                num: 20,
                a: 1
            }
        }, {
            type: "indObj",
            keyType: "string",
            valueType: testReflection,
        }, "in")
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
        let filtered = filter("asd", refl, "out") as any
        expect(filtered).toEqual("asd")
        filtered = filter({ str: "asd", num: 20, a: 1 }, refl, "out")
        expect((filtered as rec).str).toEqual("asd")
        expect((filtered as rec).num).toEqual(20)

        filtered = filter({ str: "asd", num: 10 }, refl, "in") as any
        expect(filtered.str).toEqual("asd")
        expect(filtered.num).toEqual(10)

        filtered = filter("asd", refl, "in") as any
        expect(filtered).toEqual("asd")


    })
    it("return zero", () => {
        let refl: TypeReflection = {
            type: "number"
        }
        let filtered = filter(0, refl, "out")
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
        let filtered = filter([0, "1"], refl, "out")
        expect((filtered as rec[])[0]).toEqual(0)
        expect((filtered as rec[])[1]).toEqual("1")
    })
    it("filterOutFast", () => {
        let filtered = filter(undefined, { type: "number", optional: true }, "in")
        expect(filtered).toBeUndefined()

        filtered = filter([1, 2], { type: "Array", arrayElementType: { type: "number" } }, "in")
        expect((filtered as rec)[1]).toEqual(2)

        filtered = filter({ a: 1, b: 2 }, { type: "indObj", valueType: { type: "number" }, keyType: "string" }, "in")
        expect((filtered as rec).b).toEqual(2)
    })
    it("filterOut", () => {
        let filtered = filter(undefined, { type: "number", optional: true }, "in")
        expect(filtered).toBeUndefined()

        filtered = filter([1, 2], { type: "Array", arrayElementType: { type: "number" } }, "in")
        expect((filtered as rec)[1]).toEqual(2)

        filtered = filter({ a: 1, b: 2 }, { type: "indObj", valueType: { type: "number" }, keyType: "string" }, "in")
        expect((filtered as rec).b).toEqual(2)


        let arr = [1, "1", "true", "y", "yes", true]
        arr.forEach(v => expect(filter(v, { type: "boolean" }, "in")).toBeTruthy())

        expect(filter(0, { type: "boolean" }, "in")).toBeFalsy()


    })
})