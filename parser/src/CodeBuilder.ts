export class CodeBuilder {

    private data: string[] = []
    private textIndent = 0

    print(str: string): void {
        this.data.push("    ".repeat(this.textIndent).concat(str))
    }

    getPrint(): { (str: string): void } {
        return this.print.bind(this)
    }

    get(): string {
        return this.data.join("\n")
    }

    indentPlus(): void {
        this.textIndent++
    }

    indentMinus(): void {
        this.textIndent--
    }
}