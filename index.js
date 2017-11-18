'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _urlParse = require('url-parse');

var _urlParse2 = _interopRequireDefault(_urlParse);

var _http = require('http');

var _http2 = _interopRequireDefault(_http);

var _express = require('express');

var _express2 = _interopRequireDefault(_express);

var _socket = require('socket.io');

var _socket2 = _interopRequireDefault(_socket);

var _timers = require('timers');

var _crypto = require('crypto');

var _crypto2 = _interopRequireDefault(_crypto);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _toConsumableArray(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++) { arr2[i] = arr[i]; } return arr2; } else { return Array.from(arr); } }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var GlitrRouter = function () {
    function GlitrRouter(routes, options) {
        _classCallCheck(this, GlitrRouter);

        this.options = options;
        this.routes = routes.map(function (route) {
            return typeof route.handler === 'function' ? _extends({}, route, { handler: [route.handler] }) : route;
        });

        this.app = (0, _express2.default)();
        this.server = _http2.default.createServer(this.app);
        this.io = new _socket2.default(this.server);

        this.sockets = {};
    }

    _createClass(GlitrRouter, [{
        key: 'generateExpressRoutes',
        value: function generateExpressRoutes() {
            var _this = this;

            var _options = this.options,
                namespace = _options.namespace,
                _options$expressDefau = _options.expressDefault,
                expressDefault = _options$expressDefau === undefined ? true : _options$expressDefau;


            this.routes.forEach(function (route) {

                if (route.hasOwnProperty('express') && route.express || expressDefault) {
                    var _app;

                    var namespacePrefix = !!namespace ? '/' + namespace : '';
                    var endpoint = '' + namespacePrefix + route.path;
                    (_app = _this.app)[route.method].apply(_app, [endpoint].concat(_toConsumableArray(route.handler)));
                }
            });
        }
    }, {
        key: 'generateSocketEmitter',
        value: function generateSocketEmitter(socket, method, path, payload) {
            var _this2 = this;

            var headers = arguments.length > 4 && arguments[4] !== undefined ? arguments[4] : {};

            return new Promise(function (resolve, reject) {
                if (!!headers.callback) {
                    var requestTimeout = _this2.options.requestTimeout;

                    var randomHash = _crypto2.default.randomBytes(64).toString('hex');

                    var requestTimer = (0, _timers.setTimeout)(function () {
                        reject('request timed out :(');
                    }, requestTimeout);

                    headers.callback = randomHash;
                    _this2.socket.once(randomHash, function (payload) {
                        clearTimeout(requestTimer);
                        resolve(payload);
                    });
                }

                socket.emit(method + '::>' + path, { headers: headers, body: payload });
            });
        }
    }, {
        key: 'generateSocketEmitHandlers',
        value: function generateSocketEmitHandlers(socket) {
            var _this3 = this;

            return {
                get: function get(path, payload, headers) {
                    return _this3.generateSocketEmitter(socket, 'get', path, payload, headers);
                },
                post: function post(path, payload, headers) {
                    return _this3.generateSocketEmitter(socket, 'post', path, payload, headers);
                },
                put: function put(path, payload, headers) {
                    return _this3.generateSocketEmitter(socket, 'put', path, payload, headers);
                },
                delete: function _delete(path, payload, headers) {
                    return _this3.generateSocketEmitter(socket, 'delete', path, payload, headers);
                }
            };
        }
    }, {
        key: 'generateSocketioRoutes',
        value: function generateSocketioRoutes() {
            var _this4 = this;

            var _options2 = this.options,
                _options2$namespace = _options2.namespace,
                namespace = _options2$namespace === undefined ? '' : _options2$namespace,
                _options2$socketioDef = _options2.socketioDefault,
                socketioDefault = _options2$socketioDef === undefined ? true : _options2$socketioDef;


            this.io.of(namespace).on('connection', function (socket) {
                _this4.sockets[socket.id] = _this4.generateSocketEmitHandlers(socket);
                socket.on('disconnect', function () {
                    return delete _this4.sockets[socket.id];
                });

                _this4.routes.forEach(function (route) {
                    if (route.hasOwnProperty('socketio') && route.socket || socketioDefault) {
                        socket.on(route.method + '::>' + route.path, _this4.generateSocketHandler(socket, route));
                    }
                });
            });
        }
    }, {
        key: 'generateSocketHandler',
        value: function generateSocketHandler(socket, route) {
            return function (payload) {
                var body = payload.body,
                    headers = payload.headers;

                var req = {
                    headers: _extends({}, headers, (0, _urlParse2.default)(route.path)),
                    body: body
                };

                var generateReponse = function generateReponse(status) {
                    return function (data) {
                        var headerProps = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};

                        var newHeaders = _extends({
                            status: status
                        }, headers, headerProps);

                        if (!!headers.callback) {
                            socket.emit(headers.callback, { headers: newHeaders, body: data });
                        }
                    };
                };

                var res = {
                    send: generateReponse(200),
                    end: generateReponse(200),
                    emit: generateReponse(200),
                    fail: generateReponse(400),
                    error: generateReponse(200)
                };

                var runHandler = function runHandler(index) {
                    route.handler[index](req, res, function () {
                        return runHandler(index + 1);
                    });
                };

                runHandler(0);
            };
        }
    }, {
        key: 'listen',
        value: function listen(port, callback) {
            var _this5 = this;

            this.server.listen(port, function () {
                _this5.generateExpressRoutes();
                _this5.generateSocketioRoutes();
                callback();
            });
        }
    }]);

    return GlitrRouter;
}();

exports.default = GlitrRouter;

