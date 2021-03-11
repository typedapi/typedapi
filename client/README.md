# TypedAPI Client library

**TypedAPI** is set of libraries for creating client-server APIs for applications written in typescript. 

• [Website](https://typedapi.com) • [Documentation](https://typedapi.com/getting-started) •

Client base functionality for TypedAPI. Not client itself.

- [Connector.ts](src/Connector.ts): Connector class for preparing data for server and storing subscriptions
- [events.ts](src/events.ts): Events intarfaces and CoreInterface
- [getApiCreator.ts](src/getApiCreator.ts): Api factory
- [NotConnectedError.ts](src/NotConnectedError.ts): Error that thrown when connection fail
- [ObjectProxy.ts](src/ObjectProxy.ts): Proxy for object that can be sent between client and server
- [TransportInterface.ts](src/TransportInterface.ts): Interface for transports that provide data tranportation to server
