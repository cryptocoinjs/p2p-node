import { Int } from '../../../protocol-types/bitcoin';

const order = ['nonce'];

function template(data: PingPongMessage) {
    return {
        nonce: Int.makeUint64(data.nonce),
    };
}

export function makeBy(Message: DIMessage, data: PingPongMessage) {
    const message = new Message(order);
    return message.make(template(data));
}

export function parse(data: Buffer) {
    return Int.parseUint64(data).value;
}