import { Event, ParametricEvent } from "../src/events"

describe("Events", () => {

    it("basic event", () => {
        let val: string = ""
        let event = new Event<string>()
        let subscription = event.subscribe(v => val = v)
        event.fire("data")
        expect(val).toEqual("data")
        subscription.unsubscribe()
        event.fire("data2")
        expect(val).toEqual("data")
    })

    it("parametric event", () => {
        let val: string = ""
        let event = new ParametricEvent<string, string, string>(() => true)
        let subscription = event.subscribe(v => val = v)
        event.fire("data", "")
        expect(val).toEqual("data")
        subscription.unsubscribe()
        event.fire("data2", "")
        expect(val).toEqual("data")
    })

}) 