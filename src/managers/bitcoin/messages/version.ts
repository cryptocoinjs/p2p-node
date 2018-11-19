import { Int, Str } from '../../../protocol-types/bitcoin';

const order = ['version', 'services', 'timestamp', 'addr_recv', 'addr_from', 'nonce', 'user_agent', 'start_height'];

const parseTemplate = {}

function template(data: versionMessageData) {
    return {
        version: Int.makeUint32(data.version),
        services: Int.makeUint64(data.services),
        timestamp: Int.makeUint64(data.timestamp),
        addr_recv: data.addr_recv,
        addr_from: data.addr_from,
        nonce: Int.makeUint64(data.nonce),
        user_agent: Str.makeVarStr(data.user_agent),
        start_height: Int.makeUint32(data.start_height),
    };
}

export function makeBy(Message: DIMessage, data: versionMessageData) {
    const message = new Message(order);
    return message.make(template(data));
}