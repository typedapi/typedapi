import {
    TypeReflection,
    MethodReflection,
} from "typedapi-core"

const DATE_VALIDATOR = /^(-?(?:[1-9][0-9]*)?[0-9]{4})-(1[0-2]|0[1-9])-(3[01]|0[1-9]|[12][0-9])T(2[0-3]|[01][0-9]):([0-5][0-9]):([0-5][0-9])(.[0-9]+)?(Z)?$/

// bad parameter error string
const bp = (key: string, type: string, typeOfData: string) => `Parameter ${key} should be ${type}, ${typeOfData} given`

/**
 * Validate input data for specific reflection.
 * If not validated, returns error string
 */
export const validate = (typeReflection: TypeReflection, data: unknown, key = "", allowUnknown = false): true | string => {

    if ((data === undefined || data === null) && typeReflection.optional) {
        return true
    }

    switch (typeReflection.type) {

        case "Array":
            if (!Array.isArray(data)) {
                return bp(key, typeReflection.type, typeof data)
            }
            for (let i = 0; i < data.length; i++) {
                const validationResult = validate(typeReflection.arrayElementType, data[i], `${key}[${i}].`, allowUnknown)
                if (validationResult !== true) {
                    return validationResult
                }
            }
            return true

        case "Date":
            if (typeof data !== "string") {
                return bp(key, typeReflection.type, typeof data)
            }
            if (!data.match(DATE_VALIDATOR)) {
                return `Parameter ${key} bad ISO date: ${data}`
            }
            return true

        case "boolean":
        case "number":
        case "string":
            if (typeof data !== typeReflection.type) {
                return bp(key, typeReflection.type, typeof data)
            }
            return true

        case "Enum":
            if (typeof data !== "number") {
                return bp(key, typeReflection.type, typeof data)
            }
            if (!Number.isSafeInteger(data)) {
                return `${key}: ${data} should be integer`
            }
            if (data > typeReflection.maxIndex) {
                return `${key}: ${data} should be < ${typeReflection.maxIndex}`
            }
            return true

        case "object":
            if (typeof data !== "object" || data === null) {
                return bp(key, typeReflection.type, typeof data)
            }
            for (const dataKey in data) {
                if (false === (dataKey in typeReflection.children)) {
                    const interfaceKeys = Object.keys(typeReflection.children)
                    return `Property ${key}.${dataKey} not in interface with keys [${interfaceKeys.join(", ")}]`
                }
            }
            for (const interfaceKey in typeReflection.children) {
                if (false === (interfaceKey in data) && typeReflection.children[interfaceKey].optional !== true) {
                    const interfaceKeys = Object.keys(typeReflection.children)
                    return `Property ${key}.${interfaceKey} of interface [${interfaceKeys.join(", ")}] not in data with keys [${Object.keys(data).join(", ")}]`
                }
                const validateResult = validate(typeReflection.children[interfaceKey], (data as Record<string, unknown>)[interfaceKey], key + interfaceKey + ".", allowUnknown)
                if (validateResult !== true) {
                    return validateResult
                }
            }
            return true

        case "indObj":
            if (typeof data !== "object" || data === null) {
                return bp(key, typeReflection.type, typeof data)
            }
            for (const objKey in data) {
                if (typeReflection.keyType === "number" && !objKey.match(/^(0|[1-9][0-9]*)$/)) {
                    return `'Bad number key in ${key}: ${objKey}`
                }
                const validationResult = validate(typeReflection.valueType, (data as Record<string, unknown>)[objKey], key + objKey + ".", allowUnknown)
                if (validationResult !== true) {
                    return validationResult
                }
            }
            return true

        case "value":
            if (data === typeReflection.value) return true
            return `'${key}': '${data}' should be equal to '${typeReflection.value}'`

        case "union": {
            let errors: unknown[] | undefined
            for (let i = 0; i < typeReflection.unionTypes.length; i++) {
                const t = typeReflection.unionTypes[i]
                const validationResult = validate(t, data, `${key}[${i}].`, allowUnknown)
                if (validationResult === true) {
                    return true
                } else {
                    if (!errors) errors = []
                    errors.push(validationResult)
                }
            }
            return `'${key}': bad value for union\n${errors ? errors.join("\n") : "no union items"}`
        }
        case "Tuple": {
            if (!Array.isArray(data)) {
                return bp(key, typeReflection.type, typeof data)
            }
            let minLength = typeReflection.tupleTypes.length
            for (let i = typeReflection.tupleTypes.length - 1; i >= 0; i--) {
                if (!typeReflection.tupleTypes[i].optional) break
                minLength--
            }
            if (data.length < minLength || data.length > typeReflection.tupleTypes.length) {
                return `'${key}': bad tuple length ${typeReflection.tupleTypes.length}`
            }
            for (let i = 0; i < data.length; i++) {
                const t = typeReflection.tupleTypes[i]
                const d = data[i]
                const validationResult = validate(t, d, `${key}[${i}].`, allowUnknown)
                if (validationResult !== true) {
                    return validationResult
                }
            }
            return true
        }
        case "null":
            return data === null ? true : `Null expected, ${data} passed`

        case "undefined":
            return data === undefined ? true : `Undefined expected, ${data} passed`

        case "unknown":
            if (!allowUnknown) {
                throw new Error(`${key}: unknown not allowed`)
            }
            return true

        default:
            throw new Error(`Bad reflection type: ${typeReflection.type}`)
    }
}

/**
 * Validate input data for method.
 * If not validated, returns error string
 */
export const validateMethod = (methodReflection: MethodReflection, data: unknown, methodName: string): true | string => {

    if (!methodReflection.params || !methodReflection.params.length) {
        if (data !== undefined && (!Array.isArray(data) || data.length > 0)) {
            return `Method ${methodName} has no parameters, ${data} passed`
        }
        return true
    }

    if (!Array.isArray(data)) {
        return `Method data for ${methodName} should be Array`
    }

    if (data.length > methodReflection.params.length) {
        return `Method ${methodName} has ${methodReflection.params.length} parameters, ${data.length} passed`
    }

    let injectionNumber = 0
    for (let i = 0; i < data.length; i++) {
        const t = methodReflection.params[i]
        if (t.type === "injection") {
            injectionNumber++
            continue
        }
        const validationResult = validate(t, data[i], `${methodName}[${i - injectionNumber}].`)
        if (validationResult !== true) {
            return validationResult
        }
    }

    return true
}