import { Int, Str } from '../../../protocol-types/bitcoin';
import { messageChecksum, hexToString } from '../../../utils';

type messageHead = {
    magic: number,
    command: string,
    length: number,
    checksum: Buffer,
    payload: Buffer
}

const order = ['magic', 'command', 'length', 'checksum', 'payload'];

const template = (data: messageHead) => ({
    magic: Int.makeUint32(data.magic),
    command: Str.makeStr12(data.command),
    length: Int.makeUint32(data.length),
    checksum: data.checksum,
    payload: data.payload
});

export function makeBy(Message: DIMessage, data: messageHead) {
    const message = new Message(order);
    return message.make(template(data));
}

const parseOrder = ['magic', 'command', 'length', 'checksum'];

const parseTemplate = {
    magic: Int.parseUint32,
    command: Str.parseChars(12),
    length: Int.parseUint32,
    checksum: Int.parseUint32,
};

export function parse(Parser: DIParser, data: Buffer) {
    const parser = new Parser(parseOrder);
    const { command: hexCmd, length, checksum } = parser.parse(parseTemplate, data);
    const command = hexToString(String(hexCmd));
    if (length > 0) {
        const payload = Buffer.alloc(<number>length);
        data.copy(payload, 0, parser.currentCursor / 8);
        const checksumCalc = messageChecksum(payload).readUIntLE(0, 4);
        if (+checksum != +checksumCalc) {
            console.log('Supplied checksum of ' + checksum + ' does not match calculated checksum of ' + checksum);
        }
        return {
            command: command,
            bufferPayload: payload
        };
    }
    return {
        command: command,
        bufferPayload: Buffer.alloc(0)
    };
}