import * as fs from "fs"
import { buildInterface } from "./buildInterface"
import { buildReflection, filterReflectionInjections } from "./buildReflection"
import { getDeclaration } from "./getDeclaration"
import { CodeBuilder } from "./CodeBuilder"

/**
 * Build configuration
 */
export interface BuildConfig {
    /**
     * Path to file where your Api object
     */
    sourceFilename: string

    /**
     * Class name in file (ex Api, Backend, MyCompanyApi etc)
     */
    sourceObjectName: string

    /**
     * Ouput file name for client where will 
     * be interface, reflection, and Api factory
     */
    outFilename: string

    /**
     * Ouput file name for server where will be
     * stored Api reflection
     */
    reflectionOutFileName: string
}

export const build = (config: BuildConfig): void => {
    if (false === fs.existsSync(config.sourceFilename)) {
        throw new Error(`Source filename not found: ${config.sourceFilename}`)
    }
    const apiDeclaration = getDeclaration(config.sourceFilename, config.sourceObjectName)
    const reflection = buildReflection(apiDeclaration)
    const filteredReflection = filterReflectionInjections(reflection)
    let b = new CodeBuilder()
    let p = b.print.bind(b)
    p("// Generated file. Do not modify it.")
    p("import { getApiCreator, Event, ParametricEvent } from \"typedapi-client\"")
    p("import { ApiObjectReflection } from \"typedapi-core\"")
    buildInterface(apiDeclaration, b, config.sourceObjectName)
    p(`const reflection: ApiObjectReflection = ${JSON.stringify(filteredReflection, undefined, 4)}`)
    p(`export const createClient = getApiCreator<${config.sourceObjectName}>(reflection)\n`)
    fs.writeFileSync(config.outFilename, b.get())

    b = new CodeBuilder()
    p = b.print.bind(b)
    p("// Generated file. Do not modify it.")
    p("import { ApiObjectReflection } from \"typedapi-core\"")
    p(`export const reflection: ApiObjectReflection = ${JSON.stringify(reflection, undefined, 4)}\n`)
    fs.writeFileSync(config.reflectionOutFileName, b.get())
}