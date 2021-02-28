import { TypeReflection } from "typedapi-core"

/**
 * Filter data for server ("out") or for client from server request ("in")
 */
export const filter = (data: unknown, typeReflection: TypeReflection, direction: "in" | "out"): unknown => {

    let newObject: Record<string, unknown>

    if (data === undefined && typeReflection.optional) {
        return data
    }

    switch (typeReflection.type) {

        case "Date":
            if (direction === "in") {
                data = new Date(data as string)
            } else {
                data = (data as Date).toISOString()
            }
            break

        case "object":
            newObject = {}
            for (const key in typeReflection.children) {
                newObject[key] = filter((data as Record<string, unknown>)[key], typeReflection.children[key], direction)
            }
            data = newObject
            break

        case "Array":
            data = (data as unknown[]).map(item => filter(item, typeReflection.arrayElementType, direction))
            break

        case "indObj":
            newObject = {}
            for (const key in (data as Record<string, unknown>)) {
                newObject[key] = filter((data as Record<string, unknown>)[key], typeReflection.valueType, direction)
            }
            data = newObject
            break

        case "Tuple":
            data = typeReflection.tupleTypes.map((tt, index) => filter((data as unknown[])[index], tt, direction))
            break
    }
    return data
}