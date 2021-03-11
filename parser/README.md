# TypedAPI Parser library

• [Website](https://typedapi.com) • [Documentation](https://typedapi.com/getting-started) •

**TypedAPI** is set of libraries for creating client-server APIs for applications written in typescript. 
You describe API like ordinar class with only methods that return Promise. 
Then parser will create interface based on that class.
Interface will be used by client`s application.
Then you only need to configure connectors (HTTP and WebSocket available).
Also API class can contain Events (HTTP connector will use HTTP polling) and child classes. For more information see [documentation](https://typedapi.com/getting-started).

## About this library

This library export only one method "**build**" that parse your api class and create files 
with reflection for server and with interface and reflection for client. It accept only one parameter with configuration:

```typescript
interface BuildConfig {
    /**
     * Path to file where your Api object
     */
    sourceFilename: string

    /**
     * Class name in file (ex Api, Backend, MyCompanyApi etc)
     */
    sourceObjectName: string

    /**
     * Ouput file name for client where will 
     * be interface, reflection, and Api factory
     */
    outFilename: string

    /**
     * Ouput file name for server where will be
     * stored Api reflection
     */
    reflectionOutFileName: string
}
```

## How to build api interface

Install TypedApi parser:

```bash
npm install --save typedapi-parser
```

How to run from code:

```typescript
import {build} from "typedapi-parser"
build({
    sourceFilename: "./src/BackendApi.ts",
    sourceObjectName: "BackendApi",
    outFilename: "../client/apiFactory.ts",
    reflectionOutFileName: "./apiReflection.ts",
})
```

How to run from cli:
```bash
./node-modules/.bin/typedapi-parser ./src/BackendApi.ts BackendApi ../client/apiFactory.ts ./apiReflection.ts
```

Cli accepts parameters: 
```
typedapi-parse [sourceFilename] [sourceObjectName] [outFilename] [reflectionOutFileName]
```

How to create script in package.json:

```json
{
    "scripts": {
        "parseApi": "typedapi-parse ./src/BackendApi.ts BackendApi ../client/apiFactory.ts ./apiReflection.ts"
    }
}
```

Then just run parser like 
```bash
npm run parseApi
```

For more information see [Getting started](https://typedapi.com/getting-started) page to start working with TypedAPI.