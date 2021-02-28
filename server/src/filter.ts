import {
    TypeReflection,
    MethodReflection,
} from "typedapi-core"
import { validate } from "./validation"

/**
 * Filter input data
 * Now only replace date strings by Date object
 */
export const filterIn = (data: unknown, typeReflection: TypeReflection): unknown => {

    let newObject: Record<string, unknown>

    if ((data === undefined || data === null) && typeReflection.optional) {
        return undefined
    }

    switch (typeReflection.type) {

        case "object":
            newObject = {}
            for (const key in typeReflection.children) {
                newObject[key] = filterIn((data as Record<string, unknown>)[key], typeReflection.children[key])
            }
            data = newObject
            break

        case "Array":
            data = (data as unknown[]).map(item => filterIn(item, typeReflection.arrayElementType))
            break

        case "Date":
            data = new Date(data as string)
            break

        case "indObj":
            newObject = {}
            for (const key in (data as Record<string, unknown>)) {
                newObject[key] = filterIn((data as Record<string, unknown>)[key], typeReflection.valueType)
            }
            data = newObject
            break

        case "Tuple":
            data = typeReflection.tupleTypes.map((tt, index) => filterIn((data as unknown[])[index], tt))
            break

        case "union":
            for (const t of typeReflection.unionTypes) {
                if (validate(t, data, "filterin") === true) {
                    return filterIn(data, t)
                }
            }
            break

    }
    return data
}

/**
 * Filter output data fast. 
 * No type checks.
 */
export const filterOutFast = (data: unknown, typeReflection: TypeReflection): unknown => {

    let newObject: Record<string, unknown>

    if (data === undefined && typeReflection.optional) {
        return data
    }

    switch (typeReflection.type) {

        case "Date":
            data = (data as Date).toISOString()
            break

        case "object":
            newObject = {}
            for (const key in typeReflection.children) {
                newObject[key] = filterOutFast((data as Record<string, unknown>)[key], typeReflection.children[key])
            }
            data = newObject
            break

        case "Array":
            data = (data as unknown[]).map(item => filterOutFast(item, typeReflection.arrayElementType))
            break

        case "indObj":
            newObject = {}
            for (const key in (data as Record<string, unknown>)) {
                newObject[key] = filterOutFast((data as Record<string, unknown>)[key], typeReflection.valueType)
            }
            data = newObject
            break

        case "Tuple":
            data = typeReflection.tupleTypes.map((tt, index) => filterOutFast((data as unknown[])[index], tt))
            break

        case "union": {
            let lastValidateResult = "No errors"
            for (const t of typeReflection.unionTypes) {
                const result = validate(t, data, "filterout")
                if (result === true) {
                    return filterOutFast(data, t)
                } else {
                    lastValidateResult = result
                }
            }
            throw new Error(lastValidateResult)
        }


    }
    return data
}

/**
 * Filter ouput data with type checking
 */
export const filterOut = (data: unknown, typeReflection: TypeReflection): unknown => {

    let newObject: Record<string, unknown>

    if (data === undefined && typeReflection.optional) {
        return data
    }

    switch (typeReflection.type) {

        case "Date":
            data = (data as Date).toISOString()
            break

        case "object":
            newObject = {}
            for (const key in typeReflection.children) {
                newObject[key] = filterOut((data as Record<string, unknown>)[key], typeReflection.children[key])
            }
            data = newObject
            break

        case "Array":
            data = (data as unknown[]).map(item => filterOut(item, typeReflection.arrayElementType))
            break

        case "indObj":
            newObject = {}
            for (const key in (data as Record<string, unknown>)) {
                newObject[key] = filterOut((data as Record<string, unknown>)[key], typeReflection.valueType)
            }
            data = newObject
            break

        case "Tuple":
            data = typeReflection.tupleTypes.map((tt, index) => filterOut((data as unknown[])[index], tt))
            break

        case "number":
        case "Enum":
            if (typeof data !== "number" || isNaN(data)) {
                throw new Error(`Bad number: ${data}`)
            }
            if (typeReflection.type === "Enum" && data > typeReflection.maxIndex) {
                throw new Error(`Max index error: ${data} > ${typeReflection.maxIndex}`)
            }
            break

        case "string":
            if (typeof data !== "string") {
                if (typeof data === "number") {
                    data = data.toString()
                } else {
                    throw new Error("Bad number: " + (typeof data))
                }
            }
            break

        case "boolean":
            if (typeof data !== "boolean") {
                data = [1, "1", "true", "y", "yes"].indexOf(data as string) !== -1
            }
            break

        case "undefined":
            data = undefined
            break

        case "null":
            data = null
            break

        case "union": {
            let lastValidateResult = "No errors"
            for (const t of typeReflection.unionTypes) {
                const result = validate(t, data, "filterout")
                if (result === true) {
                    return filterOutFast(data, t)
                } else {
                    lastValidateResult = result
                }
            }
            throw new Error(lastValidateResult)
        }

        default:
            throw new Error(`Bad reflection type: ${typeReflection.type}`)
    }
    return data
}

/**
 * Filter method
 */
export const filterMethod = (data: unknown[], methodReflection: MethodReflection): unknown[] => {
    if (!methodReflection.params) {
        return []
    }
    const returnValue: unknown[] = []
    let injectionsCount = 0
    methodReflection.params.forEach((p, i) => {
        if (p.type === "injection") {
            injectionsCount++
            return
        }
        returnValue.push(filterIn(data[i - injectionsCount], p))
    })
    return returnValue
}