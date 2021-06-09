import { CodeBuilder } from "./CodeBuilder"
import {
    ReferenceType,
    Type,
    IntrinsicType,
    ArrayType,
    ReflectionType,
    UnionType,
    StringLiteralType,
    UnknownType,
    TupleType,
} from "typedoc/dist/lib/models"
import { DeclarationReflection, ReflectionKind, SignatureReflection } from "typedoc"

type InterfacesMap = Map<string, ReferenceType>

class InterfaceWriter {

    private interfacesMap: InterfacesMap = new Map

    constructor(private declaration: DeclarationReflection, private builder: CodeBuilder, private coreObjectName: string = "Api") {
    }

    build() {
        const b = this.builder
        const p = b.getPrint()
        p(`export interface ${this.coreObjectName} {`)
        b.indentPlus()
        this.buildDeclaration(this.declaration)
        b.indentMinus()
        p("}")
        const printedInterfaces: string[] = []
        let interfacesCount = this.interfacesMap.size
        while (interfacesCount > 0) {
            const interfacesForPrint: [string, ReferenceType][] = []
            this.interfacesMap.forEach((t, name) => {
                if (printedInterfaces.indexOf(name) === -1) {
                    printedInterfaces.push(name)
                    interfacesForPrint.push([name, t])
                }
            })
            interfacesCount = interfacesForPrint.length
            interfacesForPrint.forEach(i => this.writeInterface(i[1], i[1].reflection!.sources![0].fileName, i[1].reflection!.sources![0].line))
        }
        return b.get()
    }

    private buildDeclaration(declaration: DeclarationReflection) {
        const p = this.builder.getPrint()
        const b = this.builder
        if (!declaration.children) {
            return
        }
        for (const child of declaration.children) {
            if (child.flags.isPrivate || child.flags.isProtected) {
                continue
            }
            if (child.comment) {
                const commentSplitted = child.comment.shortText.split("\n")
                p("/**")
                for (const commentLine of commentSplitted) {
                    p(` * ${commentLine}`)
                }
                p(" */")
            }
            if (child.kind & ReflectionKind.Property) {
                if (child.type instanceof ReferenceType) {
                    if (child.type.name === "Event" && child.type.typeArguments) {
                        p(`${child.name}: Event<${this.inlineType(child.type.typeArguments[0], declaration.sources![0].fileName, declaration.sources![0].line)}>`)
                    } else if (child.type.name === "ParametricEvent" && child.type.typeArguments) {
                        p(`${child.name}: ParametricEvent`
                            + `<${this.inlineType(child.type.typeArguments[0], declaration.sources![0].fileName, declaration.sources![0].line)}, `
                            + `${this.inlineType(child.type.typeArguments[1], declaration.sources![0].fileName, declaration.sources![0].line)}>`)
                    } else if (child.type.reflection instanceof DeclarationReflection) {
                        p(`${child.name}: {`)
                        b.indentPlus()
                        this.buildDeclaration(child.type.reflection)
                        b.indentMinus()
                        p("}")
                    } else {
                        throw new Error(`Bad type: ${child.type.type} ${child.type.name} ${child.sources![0].fileName} ${child.sources![0].line}`)
                    }
                }
            }
            if (child.kind & ReflectionKind.ObjectLiteral) {
                p(`${child.name}: {`)
                b.indentPlus()
                this.buildDeclaration(child)
                b.indentMinus()
                p("}")
            }
            if (child.signatures && (child.kind & ReflectionKind.Method || child.kind & ReflectionKind.Function)) {
                this.buildMethod(b, child.name, child.signatures[0], child.sources![0].fileName, child.sources![0].line)
            }
        }
    }

    private inlineType(type: Type, file: string, lineNumber: number): string {
        const returnValue: string[] = []
        const p = returnValue.push.bind(returnValue)
        if (type instanceof ReferenceType) {
            if (type.name === "AuthDataResponse") {
                p("boolean")
            } else if (type.reflection instanceof DeclarationReflection && type.reflection.kind & ReflectionKind.Interface) {
                if (!this.interfacesMap.has(type.reflection.name)) {
                    this.interfacesMap.set(type.reflection.name, type)
                }
                p(type.reflection.name)
            } else if (type.reflection instanceof DeclarationReflection && type.reflection.kind & ReflectionKind.TypeAlias) {
                if (!this.interfacesMap.has(type.reflection.name)) {
                    this.interfacesMap.set(type.reflection.name, type)
                }
                p(type.reflection.name)
            } else if (type.name === "Array" && type.typeArguments) {
                p(`${this.inlineArray(type.typeArguments[0], file, lineNumber)}`)
            } else if (type.name === "Date") {
                p("Date")
            } else if (type.reflection instanceof DeclarationReflection && type.reflection.type instanceof UnionType) {
                if (!this.interfacesMap.has(type.reflection.name)) {
                    this.interfacesMap.set(type.reflection.name, type)
                }
                p(type.reflection.name)
            } else if (type.reflection instanceof DeclarationReflection && type.reflection.type instanceof TupleType) {
                if (!this.interfacesMap.has(type.reflection.name)) {
                    this.interfacesMap.set(type.reflection.name, type)
                }
                p(type.reflection.name)
            } else {
                throw new Error(`Bad reference type: ${type.reflection ? ` ${type.reflection.originalName}` : ""} ${file}#${lineNumber}`)
            }
        } else if (type instanceof ReflectionType && type.declaration.kind & ReflectionKind.TypeLiteral && type.declaration.children) {
            p("{ ")
            const propertiesStrings: string[] = []
            for (const child of type.declaration.children) {
                if (!child.type) continue
                const optional = child.flags.isOptional ? "?" : ""
                propertiesStrings.push(`${child.name}${optional}: ${this.inlineType(child.type, child.sources![0].fileName, child.sources![0].line)}`)
            }
            p(propertiesStrings.join(", "))
            p(" }")
        } else if (type instanceof ArrayType) {
            p(`${this.inlineArray(type.elementType, file, lineNumber)}`)
        } else if (type instanceof IntrinsicType) {
            p(type.name)
        } else if (type instanceof StringLiteralType) {
            p(`"${type.value}"`)
        } else if (type instanceof UnionType) {
            const strings: string[] = []
            for (const typeItem of type.types) {
                strings.push(this.inlineType(typeItem, file, lineNumber))
            }
            p(strings.join(" | "))
        } else if (type instanceof UnknownType && type.name.match(/^[0-9]+$/)) {
            p(type.name)
        }
        if (!returnValue.length) {
            throw new Error(`cant build interface for type ${file}#${lineNumber}`)
        }
        return returnValue.join("")
    }

    private inlineArray(parameterType: Type, file: string, lineNumber: number): string {
        if (parameterType instanceof ArrayType) {
            return this.inlineArray(parameterType.elementType, file, lineNumber) + "[]"
        }
        if (parameterType instanceof ReferenceType && parameterType.name === "Array" && parameterType.typeArguments) {
            return this.inlineArray(parameterType.typeArguments[0], file, lineNumber) + "[]"
        }
        return this.inlineType(parameterType, file, lineNumber) + "[]"
    }

    private writeInterface(t: Type, file: string, lineNumber: number) {
        const b = this.builder
        const p = b.getPrint()
        if (t instanceof ReferenceType && t.reflection instanceof DeclarationReflection && t.reflection.type instanceof UnionType) {
            const strings: string[] = []
            for (const typeItem of t.reflection.type.types) {
                strings.push(this.inlineType(typeItem, file, lineNumber))
            }
            p(`export type ${t.name} = ${strings.join(" | ")}`)
        }
        else if (t instanceof ReferenceType && t.reflection instanceof DeclarationReflection && t.reflection.kind & ReflectionKind.Interface) {
            p(`export interface ${t.name} {`)
            b.indentPlus()
            if (t.reflection.children) {
                this.writeStructChildren(t.reflection.children)
            } else if (t.reflection.indexSignature && t.reflection.indexSignature.parameters && t.reflection.indexSignature.type) {
                const typ = t.reflection.indexSignature.parameters[0].type as Type
                p(`[key: ${this.inlineType(typ, t.reflection.sources![0].fileName, t.reflection.sources![0].line)}]: ${this.inlineType(t.reflection.indexSignature.type, t.reflection.sources![0].fileName, t.reflection.sources![0].line)}`)
            }

            b.indentMinus()
            p("}")

        } else if (t instanceof ReferenceType && t.reflection instanceof DeclarationReflection && t.reflection.type instanceof TupleType) {
            const buffer: string[] = []
            for (const item of t.reflection.type.elements) {
                buffer.push(this.inlineType(item, t.reflection.sources![0].fileName, t.reflection.sources![0].line))
            }
            p(`export type ${t.name} = [${buffer.join(", ")}]`)

        } else if (
            t instanceof ReferenceType 
            && t.reflection instanceof DeclarationReflection 
            && t.reflection.kind & ReflectionKind.TypeAlias 
            && t.reflection.type instanceof ReflectionType 
            && t.reflection.type.declaration instanceof DeclarationReflection
            && t.reflection.type.declaration.indexSignature
        ) {
            const typ = t.reflection.type!.declaration!.indexSignature!.parameters![0]!.type! as Type
            p(`export type ${t.name} = {`)
            b.indentPlus()
            p(`[key: ${this.inlineType(typ, t.reflection.sources![0].fileName, t.reflection.sources![0].line)}]: ${this.inlineType(t.reflection.type.declaration.indexSignature.type!, t.reflection.sources![0].fileName, t.reflection.sources![0].line)}`)
            b.indentMinus()
            p("}")                                    
        } else if (
            t instanceof ReferenceType 
            && t.reflection instanceof DeclarationReflection 
            && t.reflection.kind & ReflectionKind.TypeAlias 
            && t.reflection.type instanceof ReflectionType 
            && t.reflection.type.declaration instanceof DeclarationReflection
            && t.reflection.type.declaration.children
        ) {
            p(`export type ${t.name} = {`)
            b.indentPlus()
            this.writeStructChildren(t.reflection.type.declaration.children)
            b.indentMinus()
            p("}")            

        } else {
            console.error(`cant build interface for type ${t} ${file}#${lineNumber}`)
        }
    }

    private buildMethod(b: CodeBuilder, name: string, signature: SignatureReflection, file: string, lineNumber: number) {
        const parametersStrings: string[] = []
        if (signature.parameters) {
            for (let i = 0; i < signature.parameters.length; i++) {
                const parameter = signature.parameters[i]
                if (["apiUserId", "apiAuthData", "apiConnectionData"].indexOf(parameter.name) >= 0) {
                    continue
                }
                if (!parameter.type) continue
                const optional = parameter.flags.isOptional ? "?" : ""
                parametersStrings.push(`${parameter.name}${optional}: ${this.inlineType(parameter.type, signature.sources![0].fileName, signature.sources![0].line)}`)
            }
        }
        if (!(signature.type instanceof ReferenceType) || signature.type.name !== "Promise") {
            throw new Error(`Method ${name} should return Promise ${file}#${lineNumber}`)
        }
        if (signature.type.typeArguments && signature.type.typeArguments[0]) {
            const returnString = this.inlineType(signature.type.typeArguments[0], signature.sources![0].fileName, signature.sources![0].line)
            b.print(`${name}(${parametersStrings.join(", ")}): Promise<${returnString}>`)
        }
    }

    private writeStructChildren(children: DeclarationReflection[]) {
        const b = this.builder
        const p = b.getPrint()        
        for (const child of children) {
            const optionalString = child.flags.isOptional ? "?" : ""
            if (child.type instanceof IntrinsicType) {
                p(`${child.name}${optionalString}: ${child.type.name}`)
            }
            if (child.type instanceof ArrayType) {
                p(`${child.name}${optionalString}: ${this.inlineArray(child.type.elementType, child.sources![0].fileName, child.sources![0].line)}`)
            }
            if (child.type instanceof ReferenceType && child.type.name === "Array" && child.type.typeArguments) {
                p(`${child.name}${optionalString}: ${this.inlineArray(child.type.typeArguments[0], child.sources![0].fileName, child.sources![0].line)}`)
            }
            if (child.type instanceof ReferenceType
                && child.type.reflection instanceof DeclarationReflection
                && (
                    child.type.reflection.kind & ReflectionKind.Interface
                    || child.type.reflection.kind & ReflectionKind.TypeAlias
                )
            ) {
                if (!this.interfacesMap.has(child.type.reflection.name)) {
                    this.interfacesMap.set(child.type.reflection.name, child.type)
                }
                p(`${child.name}${optionalString}: ${child.type.reflection.name}`)
            }
            if (child.type instanceof UnionType) {
                p(`${child.name}${optionalString}: ${this.inlineType(child.type, child.sources![0].fileName, child.sources![0].line)}`)
            }
            if (child.type instanceof ReferenceType && child.type.name === "Date") {
                p(`${child.name}${optionalString}: Date`)
            }           
        }
    }
}

export const buildInterface = (declaration: DeclarationReflection, b: CodeBuilder = new CodeBuilder, coreObjectName = "Api"): string => {
    const writer = new InterfaceWriter(declaration, b, coreObjectName)
    return writer.build()
}