/**
 * Decorators and utils
 */

/**
 * Logging configuration decorator
 * {logData: logDataValue}
 * logDataValue:
 * true - log all queries with input and output data [default]
 * false - no log any queries
 * "noData" - log queries but no put data to log
 * "inputOnly" - log queries with only input data
 * "outputOnly" - log queries with only output data
 */
export const LogConfig = (cfg: boolean | "inputOnly" | "outputOnly" | "noData") => {
    return function (target: unknown, propertyKey: string): void {
        updateMetadata(target, propertyKey, m => m.logConfig = cfg)
    }
}

/**
 * Decorator for events that not need subscription.
 * Subscriptions will be not stored on server.
 * Every event will be sent to all users.
 * Not working for ParametricEvents.
 */
export const BroadCastEvent = () => {
    return function (target: unknown, propertyKey: string): void {
        updateMetadata(target, propertyKey, m => m.broadcastEvent = true)
    }
}

/**
 * Access decorator for method to set user groups who can call that method
 * @param groups string | string[] group name or Array of groups
 */
export const Access = (groups: string | string[]) => {
    return function (target: unknown, propertyKey: string): void {
        if (typeof groups === "string") {
            groups = [groups]
        }
        updateMetadata(target, propertyKey, m => m.groups = groups as string[])
    }
}

/**
 * No filter decorator is used to made more performance
 * only if your return has no Data fields and you sure that 
 * you not send any columns not from response interface
 */
export const NoFilter = () => {
    return function (target: unknown, propertyKey: string): void {
        updateMetadata(target, propertyKey, m => m.noFilter = true)
    }
}

/**
 * FastFilter decorator is used to made more performance
 * if your return has no Data fields, but you not sure that 
 * you not send any columns not from response interface
 */
export const FastFilter = () => {
    return function (target: unknown, propertyKey: string): void {
        updateMetadata(target, propertyKey, m => m.fastFilter = true)
    }
}

/**
 * Get metadata for specific method or children object or event
 */
export const getMetadata = (target: unknown, property: string): ApiItemMetadata => {
    const t = target as ObjectWithTypedApiMetadata
    if (t.__apiMetaData && property in t.__apiMetaData) {
        return t.__apiMetaData[property]
    }
    return {}
}

/**
 * Extend metadata is using to inherit metadata from parent to children
 */
export const extendMetadata = (parentMetadata: ApiItemMetadata, childMetadata: ApiItemMetadata): ApiItemMetadata => {
    return Object.assign({}, parentMetadata, childMetadata)
}

/**
 * Private method for updating metadata 
 */
const updateMetadata = (target: unknown, property: string, updater: { (metadata: ApiItemMetadata): void }) => {
    const t = target as ObjectWithTypedApiMetadata
    if (!t.__apiMetaData) {
        t.__apiMetaData = {}
    }
    if (!t.__apiMetaData[property]) {
        t.__apiMetaData[property] = {}
    }
    updater(t.__apiMetaData[property])
}

/**
 * Metadata for api item
 */
export interface ApiItemMetadata {
    groups?: string[]
    logConfig?: boolean | "inputOnly" | "outputOnly" | "noData"
    broadcastEvent?: true
    fastFilter?: true
    noFilter?: true
}

/**
 * Interface for any object that can have metadata
 */
interface ObjectWithTypedApiMetadata {
    __apiMetaData?: { [key: string]: ApiItemMetadata }
}