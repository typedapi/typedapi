# TypedAPI

![build status](https://travis-ci.com/typedapi/typedapi.svg?branch=master)

• [Website](https://typedapi.com) • [Documentation](https://typedapi.com/getting-started) •

**TypedAPI** is set of libraries for creating client-server APIs for applications written in typescript. 
You describe API like ordinar class with only methods that return Promise. 
Then parser will create interface based on that class.
Interface will be used by client`s application.
Then you only need to configure connectors (HTTP and WebSocket available).
Also API class can contain Events (HTTP connector will use HTTP polling) and child classes. For more information see [documentation](https://typedapi.com/getting-started).
