import * as fs from "fs"
import { getDeclaration } from "../src/getDeclaration"
import { buildInterface } from "../src/buildInterface"
import { buildReflection } from "../src/buildReflection"

const testModelsDir = __dirname + "/buildEventModels"
let modelsCount = 0

let files = fs.readdirSync(testModelsDir)
for (let file of files) {
    let result = file.match(/test([0-9]+)/)
    if (result) {
        modelsCount = Math.max(modelsCount, parseInt(result[1]))
    }
}

const resultFilePrefix = "interface Event<T>{}\ninterface ParametricEvent<T1,T2>{}\n"

const createTest = (index: number) => {
    it(`test${index}`, () => {
        let declaration = getDeclaration(testModelsDir + `/test${index}.from.ts`, "Api")
        let result = buildInterface(declaration)
        let expectedResult = fs.readFileSync(testModelsDir + `/test${index}.result.ts`).toString()
        expect(resultFilePrefix + result).toEqual(expectedResult)

        let reflection = buildReflection(declaration)
        let reflectionString = JSON.stringify(reflection, null, 4)
        let expectedReflectionString = fs.readFileSync(testModelsDir + `/test${index}.json`).toString()
        expect(reflectionString).toEqual(expectedReflectionString)
    })
}

describe("Build interface with events", () => {
    for (let i = 1; i <= modelsCount; i++) {
        createTest(i)
    }
})