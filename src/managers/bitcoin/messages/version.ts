import { Int, Str } from '../../../protocol-types/bitcoin';
import { hexToString } from '../../../utils';
import { parseIP } from '../helpers';

declare enum Service {
    NODE_NETWORK = 1,
    NODE_GETUTXO = 2,
    NODE_BLOOM = 4,
    NODE_WITNESS = 8,
    NODE_NETWORK_LIMITED = 1024,
}

type versionMessageData = {
    version: number,
    services: Service,
    timestamp: number,
    addr_recv: Buffer,
    addr_from: Buffer,
    nonce: number
    user_agent: string,
    start_height: number,
}

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

const perserForAddr = {
    order: ['services', 'ips', 'port'],
    template: {
        services: Int.parseUint64,
        ips: parseIP,
        port: Int.parseUint16,
    }
};

const parseTemplate = {
    version: Int.parseUint32,
    services: Int.parseUint64,
    timestamp: Int.parseUint64,
    addr_recv: perserForAddr,
    addr_from: perserForAddr,
    nonce: Int.parseUint64,
    user_agent: Str.parseVarStr,
    start_height: Int.parseUint32,
};

export function parse(Parser: DIParser, data: Buffer) {
    let relay: Boolean;
    const versionParser = new Parser(order);
    const result = versionParser.parse(parseTemplate, data);
    if (result.version > 7001) {
        relay = Boolean(data[versionParser.currentCursor + 1]);
    }
    return Object.assign(result, {
        user_agent: hexToString(<string>result.user_agent),
        relay,
    });
}