import { Int, Str } from '../../../protocol-types/bitcoin';

export const versionStructure = {
    version: Int.makeUint32,
    services: Int.makeUint64,
    timestamp: Int.makeUint64,
    addr_recv: Int.makeUintX(208),
    addr_from: Int.makeUintX(208),
    nonce: Int.makeUint64,
    user_agent: Str.makeVarStr,
    start_height: Int.makeUint32,
};

export const order = ['version', 'services', 'timestamp', 'addr_recv', 'addr_from', 'nonce', 'user_agent', 'start_height'];

export function template(data: versionMessageData) {
    return {
        version: Int.makeUint32(data.version),
        services: Int.makeUint64(data.services),
        timestamp: Int.makeUint64(data.timestamp),
        addr_recv: Int.makeUintX(208)(data.addr_recv),
        addr_from: Int.makeUintX(208)(data.addr_from),
        nonce: Int.makeUint64(data.nonce),
        user_agent: Str.makeVarStr(data.user_agent),
        start_height: Int.makeUint32(data.start_height),
    };
}