# glitr-router

`glitr-router` implements router functionality for `express` `socket.io` with middleware and response functionality. this makes not only possible for connected clients to make requests to the server using HTTP verb semantics, but also provides the server with a method to achieve the same functionality on the client end from the server. this would be useful for making requests to clients to query their client-side database. this is seamlessly possible by making use of event driven nature of `socket.io` and dynamic listeners.

## Server

`./gr.js`

```javascript
import GlitrRouter from 'glitr-router';

const routes = [
    {
        path: '/get-all-users',
        method: 'get',
        handler: [
            (req, res, next) => {
                console.log('aaaa');
                next();
            },
            (req, res) => {
                console.log('blah blah');
                res.send(['list', 'of', 'users']);
            },
        ]
    },
    {
        path: '/message',
        method: 'post',
        socket: true
        handler: [
            (req, res, next) => {
                console.log('this is the first handler');
                next();
            },
            (req, res) => {
                console.log('blah blah');
                res.send(['message successfully recieved']);
            },
        ]
    }
];

const options = {
    expressDefault: true,
    socketDefault: true,
    namespace: null,
    requestTimeout: 10000
};

const gr = new GlitrRouter(routes, options);
gr.listen(1234, () => {
    console.log('server is now litening');
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
|path|required|string||the endpoint the the server listen to. when the route is set for generating an `express` route, the endpoint generated will follow the format: `/${namespace}${path}`. when the route is set for generating a `socket.io` route, the socket will be set to listen a event on the socket in the format: `${method}::>${path}`.|
|method|required|string. one of: `get`, `post`, `put`, `delete`||the method to use for transmitting the the message.|
|handler|required| function or array of functions||this is a function the takes in 3 parameters: `request`, `response`, `next`. the values passed into the function follow the same pattern as the middle ware handlers in `express`|(https://expressjs.com/en/4x/api.html#app.get). the behaviour is the same if the handler is set for `socket.io` too.|
|socket|optional|boolean|configured in the `options` parameter (see below)|use this optional attribute to override the default method for generating a route. example usage: if `expressDefault` is set to `true`, all routes will be generated in `express`. if you want to also have this endpoint available over `socket.io`; simply set this attribute to be `true`.|
|express|optional|boolean|configured in the `options` parameter (see below)|use this optional attribute to override the default method for generating a route. example usage: if `socketDefault` is set to `true`, all routes will be generated in `socket.io`. if you want to also have this endpoint available over `express`; simply set this attribute to be `true`.|

### options

an object containing the following attributes:

|attrubute|required|default|description|
|--|--|--|--|
|namespace|optional|''|a namespace to assign to all the routes. applied to both `socket.io` and `express`. namespaces are applied to `socket.io` in the method described on thier docs (https://socket.io/docs/rooms-and-namespaces/#custom-namespaces). express endpoints are names spaced with their path being configures in the format: `/${namespace}${path}`.|
|requestTimeout|optional|10000|this is the number of miliseconds to wait before throwing a timeout exception when makeing a request that expects a callback through `socket.io` (see below).|
|expressDefault|optional|true|sets all routes to use `express` endoints|
|socketDefault|optional|true|sets all routes to use `socket.io` endoints|

*it is perfectly valid to have `expressDefault` and `socketDefault` set to true. this will result in endpoints listening to both REST and websockets. this may be useful for debugging an app through some API testing tool such as Postman (https://www.getpostman.com/) or a browser without having to create websockets connections*

## Usage

when a new instance of glitr-route is created, the instance exposes the following objects:

|attribute|description
|--|--|
|app| this is the underlying `express` app instance that `glitr-router` is using. you can use this to apply any additional configurations to may want to the existing `express` instance. this should provide a transparent api to the underlying `express` instance.|
|io| this is the underlying `socket.io` app instance that `glitr-router` is using. you can use this to apply any additional configurations to may want to the existing `socket.io` instance. this should provide a transparent api to the underlying `socket.io` instance.|
|sockets|while you are able to find connected client though the regular `socket.io` object `io` mentioned earlier, there is a `socket` object created by the `glitr-router` to hold a self updating hashmap of all connected clients. to make it easier to find a particular socket to emit a message to (see below).|

## example

```javascript
import { sockets } from './gr.js';

sockets['<someClientId>'].post('/hello-world', { data: 'some payload here' });

```

*in this example, the corresponding route `/hello-world` with the http method `post` must be available on the client-side in the same namespace*

```javascript
// an example route for the client side would be:

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

for more details about the client-side implmentation see `glitr-router-client` (link to project)
