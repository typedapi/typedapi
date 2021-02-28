class Event<T>{}
class ParametricEvent<T1,T2,T3>{}
export class Api {
    event = new Event<number>()
    parametricEvent = new ParametricEvent<number, string, number>()
}