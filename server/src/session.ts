import { AuthData } from "./auth"

/**
 * SessionProviderInterface is using by HttpServer and WebSocket server
 * to store users sessions.
 */
export interface SessionProviderInterface {
    create(authData?: AuthData): Promise<string>
    get(sessionId: string): Promise<AuthData | undefined>
    continue(sessionId: string): Promise<boolean>
    delete(sessionId: string): Promise<void>
    update(sessionId: string, authdata?: AuthData): Promise<void>
}

/**
 * MemorySessionProvider stored session in memory and 
 * mainly used in development
 */
export class MemorySessionProvider implements SessionProviderInterface {

    protected sessions = new Map<string, {
        created: number
        lastTouch: number
        authData: AuthData
    }>()

    constructor(protected lifetime: number = 31 * 24 * 60 * 60 * 1000) { }

    get(sessionId: string): Promise<AuthData | undefined> {
        const session = this.sessions.get(sessionId)
        if (!session) {
            return Promise.resolve(undefined)
        }
        if (Date.now() - session.lastTouch >= this.lifetime) {
            this.delete(sessionId)
            return Promise.resolve(undefined)
        }
        return Promise.resolve(session.authData)
    }

    create(authData: AuthData = {}): Promise<string> {
        const date = new Date().getTime()
        const id = makeid()
        this.sessions.set(id, {
            authData: authData,
            created: date,
            lastTouch: date
        })
        return Promise.resolve(id)
    }

    continue(sessionId: string): Promise<boolean> {
        const session = this.sessions.get(sessionId)
        if (!session) {
            return Promise.resolve(false)
        }
        if (Date.now() - session.lastTouch >= this.lifetime) {
            this.delete(sessionId)
            return Promise.resolve(false)
        }
        session.lastTouch = Date.now()
        return Promise.resolve(true)
    }

    delete(sessionId: string): Promise<void> {
        this.sessions.delete(sessionId)
        return Promise.resolve()
    }

    update(sessionId: string, authData: AuthData = {}): Promise<void> {
        const session = this.sessions.get(sessionId)
        if (session) {
            session.authData = authData
        }
        return Promise.resolve()
    }

    clearOutdated(): Promise<void> {
        const toDelete: string[] = []
        const now = Date.now()
        this.sessions.forEach((s, id) => {
            if (now - s.lastTouch > this.lifetime) {
                toDelete.push(id)
            }
        })
        toDelete.forEach(id => {
            this.sessions.delete(id)
        })
        return Promise.resolve()
    }
}

/**
 * make session id for memory provider
 */
const makeid = () => {
    let result = ""
    const characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789"
    const charactersLength = characters.length
    for (let i = 0; i < 20; i++) {
        result += characters.charAt(Math.floor(Math.random() * charactersLength))
    }
    return result
}