import * as fs from "fs"
import { build } from "../src/build"

const clientFileTemplate = `// Generated file. Do not modify it.
import { getApiCreator, Event, ParametricEvent } from "typedapi-client"
import { ApiObjectReflection } from "typedapi-core"
{{interface}}
const reflection: ApiObjectReflection = {{reflection}}
export const createClient = getApiCreator<Api>(reflection)
`

const serverFileTemplate = `// Generated file. Do not modify it.
import { ApiObjectReflection } from "typedapi-core"
export const reflection: ApiObjectReflection = {{reflection}}
`

describe("Build test", () => {
    it("build1", () => {
        let sourceFile = __dirname + "/buildModels/test9.from.ts"
        let interfaceFile = __dirname + "/buildModels/test9.result.ts"
        let reflectionFile = __dirname + "/buildModels/test9.json"
        let outClientFile = "/tmp/__api.client.ts"
        let outServerFile = "/tmp/__api.server.ts"
        build({
            sourceFilename: sourceFile,
            sourceObjectName: "Api",
            outFilename: outClientFile,
            reflectionOutFileName: outServerFile,
        })
        let interfaceFileContents = fs.readFileSync(interfaceFile).toString()
        let reflectionFileContents = fs.readFileSync(reflectionFile).toString()
        let reflectionString = reflectionFileContents

        let outClientFileContents = fs.readFileSync(outClientFile).toString()
        let outServerFileContents = fs.readFileSync(outServerFile).toString()

        let expectedOutClientFileContents = clientFileTemplate
            .replace("{{interface}}", interfaceFileContents)
            .replace("{{reflection}}", reflectionString)

        let expectedOutServerFileContents = serverFileTemplate.replace("{{reflection}}", reflectionString)

        expect(outClientFileContents).toEqual(expectedOutClientFileContents)
        expect(outServerFileContents).toEqual(expectedOutServerFileContents)

        fs.unlinkSync(outClientFile)
        fs.unlinkSync(outServerFile)
    })

    it("build error", () => {
        const errorFunc = () => {
            build({
                sourceFilename: __dirname + "/buildModels/not-exists.ts",
                sourceObjectName: "Api",
                outFilename: "/tmp/__api.client.ts",
                reflectionOutFileName: "/tmp/__api.server.ts",
            })            
        }
        expect(errorFunc).toThrow()
    })

    it("injections", () => {
        let outClientFile = "/tmp/__api.client.ts"
        let outServerFile = "/tmp/__api.server.ts"
        
        let interfaceFileContents = fs.readFileSync(__dirname + "/injectionModel/result.ts").toString()
        let clientReflectionString = JSON.stringify(JSON.parse(fs.readFileSync(__dirname + "/injectionModel/clientResult.json").toString()), undefined, 4)
        let serverReflectionString = JSON.stringify(JSON.parse(fs.readFileSync(__dirname + "/injectionModel/serverResult.json").toString()), undefined, 4)

        build({
            sourceFilename: __dirname + "/injectionModel/from.ts",
            sourceObjectName: "Api",
            outFilename: outClientFile,
            reflectionOutFileName: outServerFile,
        })        

        let outClientFileContents = fs.readFileSync(outClientFile).toString()
        let outServerFileContents = fs.readFileSync(outServerFile).toString()

        let expectedOutClientFileContents = clientFileTemplate
            .replace("{{interface}}", interfaceFileContents)
            .replace("{{reflection}}", clientReflectionString)

        let expectedOutServerFileContents = serverFileTemplate.replace("{{reflection}}", serverReflectionString)

        expect(outClientFileContents).toEqual(expectedOutClientFileContents)
        expect(outServerFileContents).toEqual(expectedOutServerFileContents)

        fs.unlinkSync(outClientFile)
        fs.unlinkSync(outServerFile)        
    })
})