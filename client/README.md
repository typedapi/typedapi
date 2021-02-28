# TypedAPI Client library

Client base functionality for TypedAPI. Not client itself.

- [Connector.ts](src/Connector.ts): Connector class for preparing data for server and storing subscriptions
- [events.ts](src/events.ts): Events intarfaces and CoreInterface
- [getApiCreator.ts](src/getApiCreator.ts): Api factory
- [NotConnectedError.ts](src/NotConnectedError.ts): Error that thrown when connection fail
- [ObjectProxy.ts](src/ObjectProxy.ts): Proxy for object that can be sent between client and server
- [TransportInterface.ts](src/TransportInterface.ts): Interface for transports that provide data tranportation to server

## Building

```bash
git clone https://github.com/typedapi/typedapi.git
cd typedapi/core
npm install
npm run build
cd ../client
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