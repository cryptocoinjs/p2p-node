import { Int } from '../../../protocol-types/bitcoin';

type PingPongMessage = {
    nonce: number
}

const order = ['nonce'];

const parseTemplate = {
    nonce: Int.parseUint64
};

function template(data: PingPongMessage) {
    return {
        nonce: Int.makeUint64(data.nonce),
    };
}

export function makeBy(Message: DIMessage, data: PingPongMessage) {
    const message = new Message(order);
    return message.make(template(data));
}

export function parse(Parser: DIParser, data: Buffer) {
    const parser = new Parser(order);
    return parser.parse(parseTemplate, data);
}