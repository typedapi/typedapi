/**
 * Reflections for Api and types that can be sent via TypadAPI
 */

/**
* Api object reflection type. 
* That reflection will be generated from source and
* will be stored on server to validata input data
*/
export type ApiObjectReflection = {
    children?: { [key: string]: ApiObjectReflection }
    methods?: { [key: string]: MethodReflection }
    events?: { [key: string]: EventReflection }
    parametricEvents?: { [key: string]: ParametricEventReflection }
}

/**
 * Reflection of type that can be sent via TypedAPI
 */
export type TypeReflection =
    ScalarReflection
    | ArrayReflection
    | TupleReflection
    | UnionReflection
    | ValueReflection
    | EnumReflection
    | ObjectReflection
    | IndObjReflection
    | UnknownReflection
    | InjectionReflection

/**
 * Names of types for type casting
 */
export type TypeName =
    "number"
    | "string"
    | "object"
    | "boolean"
    | "Date"
    | "Array"
    | "Tuple"
    | "any"
    | "unknown"
    | "void"
    | "injection"
    | "union"
    | "indObj"
    | "value"
    | "Enum"
    | "undefined"
    | "null"

/**
 * Method reflection for client
 */
export type MethodReflection = {
    generator?: true
    next?: TypeReflection
    throw?: TypeReflection
    params?: TypeReflection[]
    return?: TypeReflection
}

/**
 * Type refletion
 * Describes interface of data that can be sent via TypedApi 
 * (number, string, object, boolean, Array, Date, void)
 */
export interface BaseReflection {
    type: TypeName
    optional?: true
}

export interface ScalarReflection extends BaseReflection {
    type: "number" | "string" | "boolean" | "Date" | "undefined" | "null"
}

export interface ArrayReflection extends BaseReflection {
    type: "Array"
    arrayElementType: TypeReflection
}

export interface TupleReflection extends BaseReflection {
    type: "Tuple"
    tupleTypes: TypeReflection[]
}

export interface InjectionReflection extends BaseReflection {
    type: "injection"
    injectionType: string
}

export interface UnionReflection extends BaseReflection {
    type: "union"
    unionTypes: TypeReflection[]
}

export interface ValueReflection extends BaseReflection {
    type: "value"
    value: string | number | boolean
}

export interface EnumReflection extends BaseReflection {
    type: "Enum"
    maxIndex: number
}

export interface UnknownReflection extends BaseReflection {
    type: "unknown"
}

export interface ObjectReflection extends BaseReflection {
    type: "object"
    children: { [key: string]: TypeReflection }
}

export interface IndObjReflection extends BaseReflection {
    type: "indObj"
    keyType: "string" | "number"
    valueType: TypeReflection
}

export interface EventReflection {
    dataType?: TypeReflection
}

export interface ParametricEventReflection {
    dataType?: TypeReflection
    parametersType?: TypeReflection
    subscriptionType: TypeReflection
}