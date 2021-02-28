interface Event<T>{}
interface ParametricEvent<T1,T2>{}
export interface Api {
    event: Event<number>
    parametricEvent: ParametricEvent<number, string>
}