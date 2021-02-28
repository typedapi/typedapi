import { getDeclaration } from "../src/getDeclaration"
import { filterReflectionInjections } from "../src/buildReflection"
import { ApiObjectReflection } from "typedapi-core"
import * as fs from "fs"

describe("some test", () => {
    it("not exists object", () => {
        let runError = () => {
            getDeclaration(__dirname + "/buildEventModels/test1.from.ts", "Api1")
        }
        expect(runError).toThrow()
    })
    it("not exists file", () => {
        let runError = () => {
            getDeclaration(__dirname + "/buildEventModels/abc.ts", "Api1")
        }
        expect(runError).toThrow()
    })
    it("filterReflection0", () => {
        let reflection: ApiObjectReflection = JSON.parse(fs.readFileSync(__dirname + "/buildModels/test7.json").toString())
        let targetReflection: ApiObjectReflection = JSON.parse(fs.readFileSync(__dirname + "/buildModels/test7.filtered.json").toString())
        let filteredReflection = filterReflectionInjections(reflection)
        expect(filteredReflection).toEqual(targetReflection)
    })
    it("filterReflection1", () => {
        let reflection: ApiObjectReflection = JSON.parse(fs.readFileSync(__dirname + "/buildModels/test8.json").toString())
        let targetReflection: ApiObjectReflection = JSON.parse(fs.readFileSync(__dirname + "/buildModels/test8.filtered.json").toString())
        let filteredReflection = filterReflectionInjections(reflection)
        expect(filteredReflection).toEqual(targetReflection)
    })          
    it("filterReflection2", () => {
        let reflection: ApiObjectReflection = JSON.parse(fs.readFileSync(__dirname + "/buildModels/test9.json").toString())
        let targetReflection: ApiObjectReflection = JSON.parse(fs.readFileSync(__dirname + "/buildModels/test9.json").toString())
        let filteredReflection = filterReflectionInjections(reflection)
        expect(filteredReflection).toEqual(targetReflection)
    })    
    it("filterReflection3", () => {
        let reflection: ApiObjectReflection = JSON.parse(fs.readFileSync(__dirname + "/buildModels/test1.json").toString())
        let targetReflection: ApiObjectReflection = JSON.parse(fs.readFileSync(__dirname + "/buildModels/test1.json").toString())
        let filteredReflection = filterReflectionInjections(reflection)
        expect(filteredReflection).toEqual(targetReflection)
    })        
    it("filterReflection4", () => {
        let reflection: ApiObjectReflection = JSON.parse(fs.readFileSync(__dirname + "/buildModels/test2.json").toString())
        let targetReflection: ApiObjectReflection = JSON.parse(fs.readFileSync(__dirname + "/buildModels/test2.json").toString())
        let filteredReflection = filterReflectionInjections(reflection)
        expect(filteredReflection).toEqual(targetReflection)
    })            
})