# TypedAPI Server library

![build status](https://travis-ci.com/typedapi/server.svg?branch=master)

• [Website](https://typedapi.com) • [Documentation](https://typedapi.com/getting-started) •

**TypedAPI** is set of libraries for creating client-server APIs for applications written in typescript. 
You describe API like ordinar class with only methods that return Promise. 
Then parser will create interface based on that class.
Interface will be used by client`s application.
Then you only need to configure connectors (HTTP and WebSocket available).
Also API class can contain Events (HTTP connector will use HTTP polling) and child classes. For more information see [documentation](https://typedapi.com/getting-started).

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

## How to start

See [Getting started](https://typedapi.com/getting-started) page to start working with TypedAPI.

## Contribute

* [Submit bugs](https://github.com/typedapi/server/issues) and help us verify fixes as they are checked in.
* Review the [source code changes](https://github.com/typedapi/server/issues/pulls).
* Contribute bug fixes as pull requests and dont forget to document and test code.

## Building

```bash
git clone https://github.com/typedapi/server.git
cd server
npm install
npm run build
```

## Testing

```bash
# all tests
npm test
# only tests without linting
npm run testOnly
# single test
npm run singleTest "test name"
# linting
npm run lint
```

For testing ports 8080,8081,8082 should be available.

## License

TypedAPI packages covered by [MIT](/LICENSE.txt) license.