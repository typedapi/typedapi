import { DeclarationReflection, ReflectionKind, SignatureReflection } from "typedoc"
import { ReferenceType, Type, IntrinsicType, ArrayType, ReflectionType, UnionType, StringLiteralType, UnknownType, TupleType } from "typedoc/dist/lib/models"
import { ApiObjectReflection, MethodReflection, TypeReflection } from "typedapi-core"
//ApiObjectReflection, MethodReflection, TypeReflection, TypeName

export const buildReflection = (declaration: DeclarationReflection): ApiObjectReflection => {

    const returnValue: ApiObjectReflection = {}

    if (!declaration.children) {
        return returnValue
    }

    for (const child of declaration.children) {
        if (child.flags.isPrivate || child.flags.isProtected) {
            continue
        }
        if (child.kind & ReflectionKind.Property) {
            if (child.type instanceof ReferenceType) {
                if (child.type.name === "Event" && child.type.typeArguments) {
                    if (!returnValue.events) returnValue.events = {}
                    returnValue.events[child.name] = {
                        dataType: parseType(child.type.typeArguments[0])
                    }
                } else if (child.type.name === "ParametricEvent" && child.type.typeArguments) {
                    if (!returnValue.parametricEvents) returnValue.parametricEvents = {}
                    returnValue.parametricEvents[child.name] = {
                        dataType: parseType(child.type.typeArguments[0]),
                        subscriptionType: parseType(child.type.typeArguments[1]),
                        parametersType: parseType(child.type.typeArguments[2])
                    }
                } else if (child.type.reflection instanceof DeclarationReflection) {
                    if (!returnValue.children) returnValue.children = {}
                    returnValue.children[child.name] = buildReflection(child.type.reflection)
                }
            }
        }
        if (child.kind & ReflectionKind.ObjectLiteral) {
            if (!returnValue.children) returnValue.children = {}
            returnValue.children[child.name] = buildReflection(child)
        }
        if (child.kind & ReflectionKind.Method || child.kind & ReflectionKind.Function) {
            if (!returnValue.methods) returnValue.methods = {}
            returnValue.methods[child.name] = parseMethod(child.signatures![0])
        }
    }

    return returnValue
}

/**
 * Parse typedoc method reflection and convert it to TypedApi method reflection
 * @param signature Typedoc method reflection
 * @returns TypedApi method reflection
 */
const parseMethod = (signature: SignatureReflection): MethodReflection => {
    const returnValue: MethodReflection = {}

    if (signature.parameters && signature.parameters.length) {
        returnValue.params = []
        for (let i = 0; i < signature.parameters.length; i++) {
            const parameter = signature.parameters[i]
            let typeReflection: TypeReflection
            if (["apiUserId", "apiAuthData"].indexOf(parameter.name) >= 0) {
                typeReflection = {
                    type: "injection",
                    injectionType: parameter.name,
                }
            } else {
                typeReflection = parseType(parameter.type!)
            }
            if (parameter.flags.isOptional) {
                typeReflection.optional = true
            }
            returnValue.params.push(typeReflection)
        }
    }
    if (signature.type instanceof IntrinsicType && signature.type.name !== "void") {
        returnValue.return = parseType(signature.type)
    } else if (signature.type instanceof ReferenceType && (signature.type!.typeArguments![0] as IntrinsicType).name !== "void") {
        returnValue.return = parseType(signature.type!.typeArguments![0])
    }

    return returnValue
}

/**
 * Parse Typedoc type reflection and convert it to TypedApi type reflection
 * @param type Typedoc type reflection
 * @returns TypedApi type reflection
 */
const parseType = (type: Type): TypeReflection => {
    let returnValue: TypeReflection
    if (type instanceof ReferenceType) {
        if (type.name === "AuthDataResponse") {
            returnValue = {
                type: "injection",
                injectionType: "AuthDataServerResponse"
            }
        } else if (type.reflection instanceof DeclarationReflection && type.reflection.kind & ReflectionKind.Interface) {
            if (type.reflection.children) {
                returnValue = {
                    type: "object",
                    children: {}
                }
                for (const child of type.reflection!.children!) {
                    returnValue.children[child.name] = parseType(child.type!)
                    if (child.flags.isOptional) {
                        returnValue.children[child.name].optional = child.flags.isOptional
                    }
                }
            } else if (type.reflection.indexSignature && type.reflection.indexSignature.parameters && type.reflection.indexSignature.type) {
                returnValue = {
                    type: "indObj",
                    keyType: (type.reflection.indexSignature.parameters[0].type! as IntrinsicType).name === "string" ? "string" : "number",
                    valueType: parseType(type.reflection.indexSignature.type)

                }
            } else {
                throw new Error("Bad type for parsing: " + type.type + " " + type.name)
            }

        } else if (type.reflection instanceof DeclarationReflection && type.reflection.type instanceof UnionType) {
            returnValue = {
                type: "union",
                unionTypes: type.reflection.type.types.map(t => parseType(t))
            }
        } else if (type.name === "Array") {
            returnValue = {
                type: "Array",
                arrayElementType: parseType(type.typeArguments![0]),
            }
        } else if (type.name === "Date") {
            returnValue = {
                type: "Date"
            }
        } else if (type.reflection instanceof DeclarationReflection && type.reflection.type instanceof TupleType) {
            returnValue = {
                type: "Tuple",
                tupleTypes: type.reflection.type.elements.map(el => parseType(el))
            }
        } else {
            throw new Error("Bad type for parsing: " + type.type + " " + type.name)
        }
    } else if (type instanceof ReflectionType && type.declaration.kind & ReflectionKind.TypeLiteral && type.declaration.children) {
        returnValue = {
            type: "object",
            children: {}
        }
        for (const child of type.declaration.children) {
            returnValue.children[child.name] = parseType(child.type!)
            if (child.flags.isOptional) {
                returnValue.children[child.name].optional = child.flags.isOptional
            }
        }
    } else if (type instanceof ArrayType) {
        returnValue = {
            type: "Array",
            arrayElementType: parseType(type.elementType),
        }
    } else if (type instanceof StringLiteralType) {
        returnValue = {
            type: "value",
            value: type.value
        }
    } else if (type instanceof UnionType) {
        returnValue = {
            type: "union",
            unionTypes: []
        }
        for (const typeItem of type.types) {
            returnValue.unionTypes.push(parseType(typeItem))
        }
    } else if (type instanceof IntrinsicType) {
        if (
            type.name === "string"
            || type.name === "number"
            || type.name === "boolean"
        ) {
            returnValue = { type: type.name }
        } else if (["any", "unknown"].indexOf(type.name) !== -1) {
            throw new Error("bad type " + type.name)
        } else if (type.name === "true" || type.name === "false") {
            returnValue = {
                type: "value",
                value: type.name === "true"
            }
        } else {
            throw new Error("bad type " + type.name)
        }
    } else if (type instanceof UnknownType && type.name.match(/^[0-9]+$/)) {
        returnValue = {
            type: "value",
            value: parseInt(type.name)
        }
    } else {
        throw new Error("Bad type for parsing: " + type.type)
    }

    return returnValue
}

/**
 * Filter api reflection from injected method parameters for client
 */
export const filterReflectionInjections = (reflection: ApiObjectReflection): ApiObjectReflection => {
    const returnValue: ApiObjectReflection = {
        events: reflection.events,
        parametricEvents: reflection.parametricEvents
    }
    if (reflection.children) {
        returnValue.children = {}
        for (const key in reflection.children) {
            returnValue.children[key] = filterReflectionInjections(reflection.children[key])
        }
    }
    if (reflection.methods) {
        returnValue.methods = {}
        for (const key in reflection.methods) {
            const methodReflection = reflection.methods[key]
            let parameters: TypeReflection[] | undefined
            if (methodReflection.params) {
                for (const param of methodReflection.params) {
                    if (param.type === "injection") continue
                    if (!parameters) parameters = []
                    parameters.push(param)
                }
            }
            let response = reflection.methods[key].return
            if (response && response.type === "injection") {
                response = { type: "boolean" }
            }
            returnValue.methods[key] = { params: parameters, return: response }
        }
    }
    return returnValue
}