# glitr-router

## Server

`glitr-router` implements router functionality for `express` `socket.io` with middleware and response functionality. this makes not only possible for connected clients to make requests to the server using HTTP verb semantics, but also provides the server with a method to achieve the same functionality on the client end from the server. this would be useful for making requests to clients to query their client-side database. this is seamlessly possible by making use of event driven nature of `socket.io` and dynamic listeners.

`./gr.js`

```javascript
import GlitrRouter from 'glitr-router';

const routes = [
    {
        path: '/route-on-server',
        method: 'post',
        socket: true,
        handler: [
            (req, res, next) => {
                console.log('[server-side] router working');
                console.log('--- message from client');
                console.log(req.body);
                console.log('---');
                next();
            },
            (req, res) => {
                console.log('[server-side] middleware working as expected');
                res.send('message from SERVER to CLIENT in response');
            }
        ]
    }
];

const options = {
    expressDefault: true, // optional: default = true
    socketioDefault: true, // optional: default = true
    namespace: 'testing', // optional: default = ''
    requestTimeout: 10000 // optional: default = 10000
};

const gr = new GlitrRouter(routes, options);
gr.listen(1234, () => {
    console.log('server is now listening');
});

export default gr;
```

the glitr-routes constructor takes 2 arguaments:

* routes
* options

### routes:

an array of objects:

|attribute|required|type|default|description
|--|--|--|--|--|
|path|required|string||the endpoint on the server to listen. when the route is set for generating an `express` route, a REST endpoint is generated in `express` to listen at the path: `/${namespace}${path}`. when the route is set to generating a `socket.io` listender, the socket will be set to listen a event in the format: `${method}::>${path}`.|
|method|required|string. one of: `get`, `post`, `put`, `delete`||the method to use for transmitting the the message.|
|handler|required| function or array of functions||this is a function the takes in 3 parameters: `request`, `response`, `next`. the values passed into the function follow the same pattern as the middleware functions in [express route handlers](https://expressjs.com/en/guide/routing.html#route-handlers). the behaviour is the same if the handler is set for `socket.io`.|
|socket|optional|boolean|configured in the `options` parameter ([see below)](#options)|use this optional attribute to override the default method for generating a route. e.g. if `expressDefault` is set to `true`, all routes will be generated in `express`. if you want to also have this endpoint available over `socket.io`, simply set this attribute to be `true`.|
|express|optional|boolean|configured in the `options` parameter ([see below](#options))|use this optional attribute to override the default method for generating a route. example usage: if `socketDefault` is set to `true`, all routes will be generated in `socket.io`. if you want to also have this endpoint available over `express`, simply set this attribute to be `true`.|

#### socket.io handlers

in the case of creating `handler` methods for `socket.io`, if the request header `callback` property **on the client** is set to `true`, the handlers methods must respond back to the client.

the handler response object has a few helper methods to help with this:

|method|description|
|--|--|
|send| sends a response with a default status code 200|
|end| sends a response with a default status code 200|
|emit| sends a response with a default status code 200|
|fail| sends a response with a default status code 400|
|error| sends a response with a default status code 400|

all these response methods take 2 parametes i.e. `res.send(data, headers)`. both parametes are options. `data` is the payload to send, `headers` is an object to pass additional data in the headers. you can assign a value to `headers.status` to sent to the client to ovverride the default status code mentioned in the previous table.

if the request takes longer than the timeout period specified in [options](#options), an exception will be thrown indicating timeout. you can handle this like a typical promise exception: `promise.catch(console.log)`.

*handlers in express behave in the same was as described in their [documentation](https://expressjs.com/en/guide/routing.html#route-handlers)*.

### options

an object containing the following attributes:

|attrubute|required|default|description|
|--|--|--|--|
|namespace|optional|''|a namespace to assign to all the routes. applied to both `socket.io` and `express`. namespaces are applied to `socket.io` in the method described on thier [docs](https://socket.io/docs/rooms-and-namespaces/#custom-namespaces). express endpoints are namespaced with their path set to listen for the path: `/${namespace}${path}`. the corresponding`socket.io` event listener is set to listen for for an event in the format: `${method}::>${path}`|
|requestTimeout|optional|10000|this is the number of miliseconds to for `socket.io` to wait before throwing a timeout exception when makeing a request that expects a callback. getting a response from the client is optional with 'socket.io` and can be dynamically required ([see below](#response)).|
|expressDefault|optional|true|sets all routes to use `express` endoints by default|
|socketDefault|optional|true|sets all routes to use `socket.io` endoints by default|

*it is perfectly valid to have `expressDefault` and `socketDefault` set to true. this will result in endpoints listening on both `express` and `socket.io`. this may be useful for debugging on a browser or an app through some API testing tool such as [Postman](https://www.getpostman.com/), without having to create websockets connections*

## Usage

when a new instance of `glitr-router` is created, the instance exposes the following objects:

|attribute|description
|--|--|
|app| this is the underlying `express` app instance that `glitr-router` is using. you can use this to apply any additional configurations to may want to the existing `express` instance. this should provide a transparent api to the underlying `express` instance.|
|io| this is the underlying `socket.io` app instance that `glitr-router` is using. you can use this to apply any additional configurations to may want to the existing `socket.io` instance. this should provide a transparent api to the underlying `socket.io` instance.|
|sockets|while you are able to find connected client though the regular `socket.io` object `io` mentioned earlier, there is a `socket` object created by the `glitr-router` to hold a self updating hashmap of all connected clients, to make it easier to find a particular socket to emit a message to [see below](#emitting-a-message).|

## example

```javascript
import { sockets } from './gr.js';

sockets['<someClientId>'].post('/hello-world', { data: 'some payload here' });

```

*in this example, the corresponding route `/hello-world` with the http method `post` must be available on the client-side in the same namespace*

```javascript
// an example route on the client side would be:

const routes = [
    {
        path: '/hello-world',
        method: 'post',
        handler: (req, res) => {
            console.log('blah blah');
            res.send(['message successfully recieved']);
        }
    }
];
```

# Emitting a message

the router on the client should use [glitr-router-client](https://www.npmjs.com/package/glitr-router-client) which uses `socket.io-client`'s websocket connection to create a router over the websocket connection.

**The Aha! moment:** this means you can send messages to the client as if it was a server. this could allow for more reliable requests sent to client and allows for an easier way to outsouce computation on connected clients.

when a client connects to the server, some *socket emitter* methods are generated and stored into a hashmap, where they keys are the connected sockets id.

```javascript
import { sockets } from './gr.js';

const connectedUser = sockets['<someClientId>'];

// console.log(Object.keys(connectedUser));
/*
    ['get', 'post', 'put', 'delete']
*/

// connectedUser.get(path, payload, headers)
// connectedUser.post(path, payload, headers)
// connectedUser.put(path, payload, headers)
// connectedUser.delete(path, payload, headers)
```

### Request

|name|required|type|description
|--|--|--|--|
|path|yes|string|a string the represents the path on the client to make the request.|
|payload|no|object|this optional first can be used for sending data to the client over the socket|
|headers|no|object|this is an option first to pass additional metadata about the request.|
|headers.callback|no|boolean|set this value to true if you want to emit a message to the client and you want the client to respond when finished.|

### Response

**Note:** when `callback` is set to true, this tells `socket.io` to respond, after processing the message, this is mean the method will return a promise object with data sent back from the client like you would expect for any regular HTTP request to `express`. the response object properties are described by the following table.

|name|description|
|--|--|
|headers|some metadata about the request sent over by the client|
|body|this is the payload the client has sent back to the server.|

### Example

```javascript
import { sockets } from './gr.js';

const connectedUser = sockets['<someClientId>'];

connectedSocket.post('/send-message',
    {
        message: 'hello world',
        recipient: 'clark'
    }, {
        callback: true
    }
).then((dataFromClient) => {
    // process dataFromClient here ...
    console.log(dataFromClient);
});
```

**for more details about the client-side implmentation see [glitr-router-client](https://www.npmjs.com/package/glitr-router-client).**