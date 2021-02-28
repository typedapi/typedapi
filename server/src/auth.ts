/**
 * User`s authorization data
 */
export type AuthData = {
    id?: string | number
    groups?: string[]
    name?: string
    email?: string
    phone?: string
}

/**
 * User`s connection data
 */
export type ConnectionData = {
    authData: AuthData
    ip: string
    sessionId?: string
    connectionId?: string
}

/**
 * Auth data response can be returned from
 * Api method to set authorization data
 * For example login, logout, and other
 */
export type AuthDataResponse = {
    newAuthData: AuthData
    response: boolean
}