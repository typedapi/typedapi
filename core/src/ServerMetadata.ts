/**
 * Its data received once from server to know some server`s settings
 */
export interface ServerMetadata {
    name: string
    version: string
    acceptedVersions?: string[]
    broadcastEvents?: string[]
    extra?: Record<string, unknown>
}