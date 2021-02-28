import { Application, DeclarationReflection } from "typedoc"

export const getDeclaration = (fileName: string, className: string): DeclarationReflection => {
    const application = new Application()
    application.bootstrap()
    application.options.setValue("module", "commonjs")
    application.options.setValue("lib", ["lib.es2015.d.ts"])
    application.options.setValue("experimentalDecorators", true)
    const projectReflection = application.convert([fileName])
    if (!projectReflection) {
        throw new Error("Cant build project reflection")
    }
    for (const reflectionId in projectReflection.reflections) {
        const reflection = projectReflection.reflections[reflectionId]
        if (reflection.name == className && reflection.parent!.originalName === fileName && reflection instanceof DeclarationReflection) {
            return reflection
        }
    }
    throw new Error("Can`t find api declaration")
}