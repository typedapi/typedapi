import { CoreEvent } from "../src/events"

describe("Events", () => {
    it("Core event", async () => {
        let event = new CoreEvent<number>()
        let result = 0
        let subscription = event.subscribe(v => result = v)
        event.fire(1)
        expect(result).toEqual(1)
        await subscription.unsubscribe()
        event.fire(2)
        expect(result).toEqual(1)        
    })
})