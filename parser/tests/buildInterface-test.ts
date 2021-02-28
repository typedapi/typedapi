import * as fs from "fs"
import { getDeclaration } from "../src/getDeclaration"
import { buildInterface } from "../src/buildInterface"
import { buildReflection } from "../src/buildReflection"
import { ApiObjectReflection } from "typedapi-core"

const testModelsDir = __dirname + "/buildModels"
let modelsCount = 0

let files = fs.readdirSync(testModelsDir)
for (let file of files) {
    let result = file.match(/test([0-9]+)/)
    if (result) {
        modelsCount = Math.max(modelsCount, parseInt(result[1]))
    }
}

const createTest = (index: number) => {
    it(`test${index}`, () => {
        let declaration = getDeclaration(testModelsDir + `/test${index}.from.ts`, "Api")
        let result: string
        let expectedResult = fs.readFileSync(testModelsDir + `/test${index}.result.ts`).toString()
        let reflection: ApiObjectReflection
        let reflectionJSON = ""
        let expectedReflectionJSON = ""
        try {
            result = buildInterface(declaration)
            reflection = buildReflection(declaration)
            reflectionJSON = JSON.stringify(reflection, null, 4)
            expectedReflectionJSON = fs.readFileSync(testModelsDir + `/test${index}.json`).toString()            
        } catch (err) {
            if (expectedResult.startsWith('"error:')) {
                result = '"error:' + err.message + '"'
            } else {
                throw err
            }
        }        
        expect(reflectionJSON).toEqual(expectedReflectionJSON)
        expect(result).toEqual(expectedResult)
    })
}

describe("Build interface", () => {
    for (let i = 1; i <= modelsCount; i++) {
        createTest(i)
    }
})