import { MemorySessionProvider } from "../src/session"
import { AuthData } from "../src/auth"
import { KeyObject } from "tls"

const simpleAuthData: AuthData = {
    id: 1,
    groups: ["manager"]
}

describe("Session", () => {
    it("all", async () => {
        let provider = new MemorySessionProvider()
        let id = await provider.create()
        await provider.get(id)
        await provider.update(id, simpleAuthData)
        await provider.clearOutdated()
        let sess = await provider.get(id)
        expect(sess!.id).toEqual(simpleAuthData.id)
        provider.continue(id)        
        provider.delete(id)
        sess = await provider.get(id)
        expect(sess).toBeUndefined()

        provider = new MemorySessionProvider(-1)
        id = await provider.create(simpleAuthData)
        sess = await provider.get(id)
        expect(sess).toBeUndefined()

        let res = await provider.continue(id)
        expect(res).toBeFalsy()
        id = await provider.create(simpleAuthData)
        res = await provider.continue(id)
        expect(res).toBeFalsy()
        provider.update(id)

        id = await provider.create(simpleAuthData)
        await provider.clearOutdated()
    })
})
