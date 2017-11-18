import urlParser from 'url-parse';
import http from 'http';
import express from 'express';
import SocketIO from 'socket.io';
import { setTimeout } from 'timers';
import crypto from 'crypto';

class GlitrRouter {
    constructor(routes, options) {    
        this.options = options;
        this.routes = routes.map(route => typeof route.handler === 'function'
            ? { ...route, handler: [route.handler] }
            : route
        );

        this.app = express();
        this.server = http.createServer(this.app);
        this.io = new SocketIO(this.server);

        this.sockets = {};
    }

    generateExpressRoutes() {
        const {
            namespace,
            expressDefault = true,
        } = this.options;

        this.routes.forEach(route => {
    
            if ((route.hasOwnProperty('express') && route.express) || expressDefault) {
                const namespacePrefix = !!namespace ? `/${namespace}` : '';
                const endpoint = `${namespacePrefix}${route.path}`;
                this.app[route.method](endpoint, ...route.handler)
            }
        });
    }

    generateSocketEmitter(socket, method, path, payload, headers = {}) {
        console.log('socket id 3:', socket.id);

        return new Promise((resolve, reject) => {
            console.log('generating emitter');

            if (!!headers.callback) {
                const { requestTimeout } = this.options;
                const randomHash = crypto.randomBytes(64).toString('hex');

                const requestTimer = setTimeout(() => {
                    reject('request timed out :(');
                }, requestTimeout);
                
                headers.callback = randomHash;
                this.socket.once(randomHash, (payload) => {
                    clearTimeout(requestTimer);
                    resolve(payload)
                });
            }

            console.log('socket id 4:', socket.id);
            socket.emit(`${method}::>${path}`, { headers, body: payload });
        });
    }

    generateSocketEmitHandlers(socket) {
        console.log('socket id 2:', socket.id);
        return {
            get: (path, payload, headers) => {
                return this.generateSocketEmitter(socket, 'get', path, payload, headers);
            },
            post: (path, payload, headers) => {
                return this.generateSocketEmitter(id, 'post', path, payload, headers);
            },
            put: (path, payload, headers) => {
                return this.generateSocketEmitter(id, 'put', path, payload, headers);
            },
            delete: (path, payload, headers) => {
                return this.generateSocketEmitter(id, 'delete', path, payload, headers);
            }
        }
    }

    generateSocketioRoutes() {
        const {
            namespace = '',
            socketioDefault = true,
        } = this.options;

        this.io.of(namespace).on('connection', socket => {
            this.sockets[socket.id] = this.generateSocketEmitHandlers(socket);
            socket.on('disconnect', () => delete this.sockets[socket.id]);
            console.log('socket id 1:', Object.keys(socket.client));
            
            this.routes.forEach(route => {    
                if ((route.hasOwnProperty('socketio') && route.socket) || socketioDefault) {
                    socket.on(`${route.method}::>${route.path}`, this.generateSocketHandler(socket, route));
                }
            });
        });
    }

    generateSocketHandler(socket, route) {
        return (payload) => {
            const { body, headers } = payload;
            console.log('received header', headers, 'body', body);
            const req = {
                headers: {
                    ...headers,
                    ...urlParser(route.path)
                },
                body
            };
            const res = {
                send: (data, headersOverride = {}) => {
                    const newHeaders = {
                        ...headers,
                        status: 200,
                        ...headersOverride
                    }

                    console.log('returning response to', headers.callback);
                    if (!!headers.callback) {
                        socket.emit(headers.callback, { headers: newHeaders, body: data });
                    }
                }
            };

            const runHandler = (index) => {
                route.handler[index](req, res, () => runHandler(index + 1));
            }

            runHandler(0);
        }
    }

    listen(port, callback) {
        this.server.listen(port, () => {
            this.generateExpressRoutes();
            this.generateSocketioRoutes();
            callback();
        });
    }
}

export default GlitrRouter;
