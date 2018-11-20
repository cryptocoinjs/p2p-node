import { Int, Str } from '../../../protocol-types/bitcoin';
import { parseAddr } from './addr';
import { hexToString } from '../../../utils';

const order = ['version', 'services', 'timestamp', 'addr_recv', 'addr_from', 'nonce', 'user_agent', 'start_height'];

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

export function parse(data: Buffer) {
    let pointer = 0;
    let relay: Boolean
    const { value: version, offset: versionDelta } = Int.parseUint32(data);
    pointer += versionDelta;
    const { value: services, offset: servicesDelta } = Int.parseUint64(data, pointer);
    pointer += servicesDelta;
    const { value: timestamp, offset: timestampDelta } = Int.parseUint64(data, pointer);
    pointer += timestampDelta;
    const { value: addr_recv, offset: addr_recvOffset } = parseAddr(data, pointer, true)
    pointer += addr_recvOffset;
    const { value: addr_from, offset: addr_fromOffset } = parseAddr(data, pointer, true)
    pointer += addr_fromOffset;
    const { value: nonce, offset: nonceDelta } = Int.parseUint64(data, pointer);
    pointer += nonceDelta;
    const { value: user_agent, offset: user_agentDelta } = Str.parseVarStr(data, pointer);
    pointer += user_agentDelta;
    const { value: start_height, offset: start_heightDelta } = Int.parseUint32(data, pointer);
    pointer += start_heightDelta;
    if (version > 7001) {
        pointer += 1;
        relay = Boolean(data[pointer])
    }
    return {
        version,
        services,
        timestamp,
        addr_recv,
        addr_from,
        nonce,
        user_agent: hexToString(user_agent),
        start_height,
        relay,
    }
}