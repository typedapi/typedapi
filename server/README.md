# TypedAPI Server library

• [Website](https://typedapi.com) • [Documentation](https://typedapi.com/getting-started) •

**TypedAPI** is set of libraries for creating client-server APIs for applications written in typescript. 

## About this library

Server functionality for TypedAPI.

- http
  - [HttpProxyClient.ts](src/http/HttpProxyClient.ts): need to process Api request on other service, when you use TypedApi as set of microservices. Used only on intrance backend.
  - [HttpServer.ts](src/http/HttpServer.ts): HTTP server with polling support for events
  - [HttpTrustServer.ts](src/http/HttpTrustServer.ts): Trust server for using in microservices.
- [ApiMap.ts](src/ApiMap.ts): interface of map with api`s methods and events. For fast access.
- [auth.ts](src/auth.ts): authorization data interfaces
- [buildMap.ts](src/buildMap.ts): function for building ApiMap object from Api realization and reflection
- [clientDataReflections.ts](src/clientDataReflections.ts): reflections to validate some user`s input data
- [decorators.ts](src/decorators.ts): Decorators that can be added to Api methods
- [events.ts](src/events.ts): Events implementations for server
- [EventsProxy.ts](src/EventsProxy.ts): Proxy for events. Hold events subscriptions, and signaling to server when need to notify client
- [filter.ts](src/filter.ts): filtering input/output data
- [log.ts](src/log.ts): Base logger interface for TypedAPI classes and text implementation for console
- [MethodProxy.ts](src/MethodProxy.ts): Proxy for methods. Receive method name and raw data, validate it, call api method and return response
- [ObjectProxy.ts](src/ObjectProxy.ts): Serializer/restorer for objects that can be sent between client and server
- [session.ts](src/session.ts): SessionProvider interface that used in many configs, and mamory provider that using for testing purposes
- [validation.ts](src/validation.ts): validators for input data
