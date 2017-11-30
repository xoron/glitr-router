import urlParser from 'url-parse';
import http from 'http';
import express from 'express';
import SocketIO from 'socket.io';
import crypto from 'crypto';

class GlitrRouter {
    constructor(routes, options = {}) {    
        const {
            expressDefault = true,
            socketioDefault = true,
            namespace = '',
            requestTimeout = 10000
        } = options;

        this.options = {
            expressDefault,
            socketioDefault,
            namespace,
            requestTimeout
        };

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
            expressDefault,
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
        return new Promise((resolve, reject) => {
            if (!!headers.callback) {
                const { requestTimeout } = this.options;
                const randomHash = crypto.randomBytes(64).toString('hex');

                const requestTimer = setTimeout(() => {
                    reject('request timed out :(');
                }, requestTimeout);
                
                headers.callback = randomHash;
                socket.once(randomHash, (payload) => {
                    clearTimeout(requestTimer);
                    resolve(payload)
                });
            }
            
            socket.emit(`${method}::>${path}`, { headers, body: payload });
        });
    }

    generateSocketEmitHandlers(socket) {
        return {
            get: (path, payload, headers) => {
                return this.generateSocketEmitter(socket, 'get', path, payload, headers);
            },
            post: (path, payload, headers) => {
                return this.generateSocketEmitter(socket, 'post', path, payload, headers);
            },
            put: (path, payload, headers) => {
                return this.generateSocketEmitter(socket, 'put', path, payload, headers);
            },
            delete: (path, payload, headers) => {
                return this.generateSocketEmitter(socket, 'delete', path, payload, headers);
            }
        }
    }

    generateSocketioRoutes() {
        const {
            namespace,
            socketioDefault,
        } = this.options;

        this.io.of(namespace).on('connection', socket => {
            this.sockets[socket.id] = this.generateSocketEmitHandlers(socket);
            socket.on('disconnect', () => delete this.sockets[socket.id]);

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
            const req = {
                headers: {
                    ...headers,
                    ...urlParser(route.path)
                },
                body
            };

            const generateReponse = (status) => {
                return (data, headerProps = {}) => {
                    const newHeaders = {
                        status,
                        ...headers,
                        ...headerProps
                    }

                    if (!!headers.callback) {
                        socket.emit(headers.callback, { headers: newHeaders, body: data });
                    }
                }
            }

            const res = {
                send: generateReponse(200),
                end: generateReponse(200),
                emit: generateReponse(200),
                fail: generateReponse(400),
                error: generateReponse(400),
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
            if (!!callback) callback();
        });
    }
}

export default GlitrRouter;
