# TypedAPI

![build status](https://travis-ci.com/typedapi/typedapi.svg?branch=master)

• [Website](https://typedapi.com) • [Documentation](https://typedapi.com/getting-started) •

**TypedAPI** is set of libraries for creating client-server APIs for applications written in typescript. 
You describe API like ordinar class with only methods that return Promise. 
Then parser will create interface based on that class.
Interface will be used by client`s application.
Then you only need to configure connectors (HTTP and WebSocket available).
Also API class can contain Events (HTTP connector will use HTTP polling) and child classes. For more information see [documentation](https://typedapi.com/getting-started).

## Building

```bash
git clone https://github.com/typedapi/typedapi.git
cd typedapi
npm install
```

## Testing

All tests:

```bash
npm test
```

To test any child project go to project`s directory and run:

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

## Contribute

* [Submit bugs](https://github.com/typedapi/typedapi/issues) and help us verify fixes as they are checked in.
* Review the [source code changes](https://github.com/typedapi/typedapi/issues/pulls).
* Contribute bug fixes as pull requests and dont forget to document and test code.

## License

TypedAPI packages covered by [MIT](/LICENSE.txt) license.