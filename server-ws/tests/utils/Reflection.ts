import {
    ApiObjectReflection
} from "typedapi-core"

export const Reflection: ApiObjectReflection = {
    children:
    {
        books:
        {
            events: {
                onCreate:
                {
                    dataType: {
                        type: "object",
                        children:
                        {
                            description: { type: "string" },
                            id: { type: "number" },
                            title: { type: "string" }
                        }
                    }

                },
                onDelete:
                {
                    dataType: { type: "number" }
                },
                onUpdate:
                {
                    dataType: {
                        type: "object",
                        children:
                        {
                            description: { type: "string" },
                            id: { type: "number" },
                            title: { type: "string" }
                        }
                    }
                },
            },
            parametricEvents: {

                onBookUpdated:
                {
                    dataType: {
                        type: "object",
                        children:
                        {
                            description: { type: "string" },
                            id: { type: "number" },
                            title: { type: "string" }
                        }
                    },
                    parametersType: { type: "number" },
                    subscriptionType: { type: "number" }
                }
            },
            methods:
            {
                count:
                    { return: { type: "number" } },
                create:
                {
                    params:
                        [{
                            type: "object",
                            children:
                                { description: { type: "string" }, title: { type: "string" } },
                        }],
                    return:
                    {
                        type: "object",
                        children:
                        {
                            description: { type: "string" },
                            id: { type: "number" },
                            title: { type: "string" }
                        }
                    }
                },
                find:
                {
                    params:
                        [{
                            type: "object",
                            children:
                            {
                                description: { type: "string", optional: true },
                                title: { type: "string", optional: true }
                            },
                            optional: true
                        },
                        { type: "number", optional: true },
                        { type: "number", optional: true }],
                    return:
                    {
                        type: "Array",
                        arrayElementType:
                        {
                            type: "object",
                            children:
                            {
                                description: { type: "string" },
                                id: { type: "number" },
                                title: { type: "string" }
                            }
                        }
                    }
                },
                get:
                {
                    params: [{ type: "number" }],
                    return:
                    {
                        type: "object",
                        children:
                        {
                            description: { type: "string" },
                            id: { type: "number" },
                            title: { type: "string" }
                        }
                    }
                },
                remove:
                {
                    params: [{ type: "number" }]
                },
                update:
                {
                    params:
                        [{ type: "number" },
                        {
                            type: "object",
                            children:
                            {
                                description: { type: "string", optional: true },
                                title: { type: "string", optional: true }
                            }
                        }]
                },
            }
        },
        someApi: {
            methods: {
                someMethod: {}
            }
        },
        someApi1: {
            children: {
                subApi: {
                    methods: {
                        someMethod: {}
                    }
                }
            }
        }
    },
    methods: {
        someMethod: {},
        errorMethod:
            {},
        serverErrorMethod:
            {},
        callBroadcastEvent: {
            params: [{ type: "number" }]
        },
        testInjectionMethod: {
            params: [{
                type: "injection",
                injectionType: "apiUserId",
                optional: true
            }],
            return: { type: "number" }
        },
        testInjectionMethod2: {
            params: [{
                type: "number"
            }],
            return: {
                type: "injection",
                injectionType: "AuthDataServerResponse"
            }
        },
        testInjectionMethod3: {
            params: [{
                type: "number",
                optional: true
            }, {
                type: "injection",
                injectionType: "apiUserId",
                optional: true
            }]
        },
        testInjectionMethod4: {
            params: [{
                type: "number"
            }, {
                type: "injection",
                injectionType: "apiUserId"
            }, {
                type: "number"
            }, {
                type: "number"
            }]
        },
        testInjectionMethod5: {
            params: [{
                type: "injection",
                injectionType: "fakeInjection"
            }]
        },
        testInjectionMethod5x: {
            return: {
                type: "injection",
                injectionType: "fakeInjection"
            }
        },
        testInjectionMethod6: {
            params: [{
                type: "injection",
                injectionType: "apiUserId"
            }, {
                type: "injection",
                injectionType: "apiAuthData"
            }, {
                type: "injection",
                injectionType: "apiConnectionData"
            }],
            return: {
                type: "object",
                children: {
                    apiUserId: {
                        type: "string"
                    }
                }
            }
        },
        testInjectionMethod7: {
            return: {
                type: "injection",
                injectionType: "AuthDataServerResponse"
            }
        },
        logout: {
            return: {
                type: "injection",
                injectionType: "AuthDataServerResponse"
            }
        },
    },
    events: {
        broadCastEvent: {
            dataType: { type: "number" }
        },
        testEvent: {
            dataType: { type: "number" }
        }
    },
    parametricEvents: {
        testParametricEvent: {
            dataType: { type: "number" },
            parametersType: { type: "number" },
            subscriptionType: { type: "number" }
        }
    }
}