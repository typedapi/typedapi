import { Access, LogConfig, getMetadata, extendMetadata, BroadCastEvent } from "../src/decorators"

let hasAccessGroup = (t: any, m: string, g: string): boolean => {
    return (getMetadata(t, m).groups?.indexOf(g) ?? -1) >= 0
}

class TestClass {

    @LogConfig(false)
    method1() { }

    @BroadCastEvent()
    @Access("group1")
    method2() { }

    @Access(["group1", "group2"])
    method3() { }
}

describe("Decorators test", () => {
    it("all", () => {
        let t = new TestClass()
        expect(hasAccessGroup(t, "method1", "group1")).toBeFalsy()
        expect(hasAccessGroup(t, "method2", "group1")).toBeTruthy()
        expect(hasAccessGroup(t, "method2", "group2")).toBeFalsy()
        expect(hasAccessGroup(t, "method3", "group2")).toBeTruthy()
        let metadata = getMetadata(t, "method1")
        expect(metadata.logConfig).toBeFalsy()

        let m = extendMetadata({}, { logConfig: false});
        expect(m.logConfig).toBeFalsy()
        expect(getMetadata(t, "method2").broadcastEvent).toBeTruthy()
    })
})