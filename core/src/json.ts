/**
 * Interface for json encoder. 
 * Most TypedAPI classes use that interface in configuration 
 * so you can provide your own JSON encoder/decoder;
 */
export interface JsonEncoderInterface {
    parse(data: string): unknown
    stringify(data: unknown): string
}