# TypedAPI Core library

**TypedAPI** is set of libraries for creating client-server APIs for applications written in typescript. 

• [Website](https://typedapi.com) • [Documentation](https://typedapi.com/getting-started) •

Core library provide several types and classes that used both by client and server.

- [errors.ts](/src/errors.ts): base errors that can be thrown by server and catched by client.
- [json.ts](/src/json.ts): interface for json encoder. Most TypedAPI classes use that interface in configuration so you can provide your own JSON encoder/decoder.
- [messages.ts](/src/messages.ts): message types that can be sent between client and server.
- [reflections.ts](/src/reflections.ts): reflections for data types that can be sent via TypeAPI.