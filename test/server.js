import GlitrRouter from '..';

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
        socket: true,
        handler: [
            (req, res, next) => {
                console.log('this is the first handler');
                next();
            },
            (req, res) => {
                console.log('blah blah');
                res.send(['message successfully recieved', req.body], {hello:'world!!'});
            },
        ]
    },
    {
        path: '/da-ting',
        method: 'post',
        socket: true,
        handler: [
            (req, res, next) => {
                console.log('thing handler 1', req);
                next();
            },
            (req, res) => {
                console.log('ting handler 2');
                res.send(['goes skraaat', { boom: req.body }], {hello:'world!!'});
            },
        ]
    }
];

const options = {
    expressDefault: true,
    socketDefault: true,
    namespace: 'testing',
    requestTimeout: 10000
};

const gr = new GlitrRouter(routes, options);
gr.listen(1234, () => {
    console.log('server is now listening');
});

setTimeout(() => {
    console.log('list of sockets:', gr.sockets);
    console.log('selected socket:', gr.sockets[Object.keys(gr.sockets)[0]]);
    console.log('type of get:', typeof gr.sockets[Object.keys(gr.sockets)[0]].get);
    gr.sockets[Object.keys(gr.sockets)[0]].get('/response', { some: 'data!!' })
        .then(data => console.log('yey! got a response', data))
        .catch(e => console.log('error:', e));
}, 5000);

export default gr;
