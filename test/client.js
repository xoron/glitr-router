import io from 'socket.io-client';

const namespace = 'testing';
const options = {};

const socket = io.connect(`http://localhost:1234/${namespace}`, options);

console.log('initialising', `http://localhost:1234/${namespace}`);

socket.on('/testing/response', (data) => {
    // console.log(data);
})

socket.on('connect', () => {
    console.log('client connected');
    // messaging.emit(MESSAGE, { hello: 'world???' })

    socket.emit('/post/message/', {
        callback: '/testing/response',
        body: {
            hello: 'world',
            something: 'else',
            and: 123
        }
    });
});