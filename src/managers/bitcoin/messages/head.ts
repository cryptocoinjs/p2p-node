import { Int, Str } from '../../../protocol-types/bitcoin';
import { messageChecksum } from '../../../utils';

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

export function parse(data: Buffer) {
    const msgLen = data.readUInt32LE(16);

    // Get command
    const commands = [];
    for (let j = 0; j < 12; j++) {
        const s = data[4 + j];
        if (s > 0) {
            commands.push(String.fromCharCode(s));
        }
    }
    const cmd = commands.join('');
    let payload: Buffer;

    const checksum = data.readUInt32BE(20);
    if (msgLen > 0) {
        payload = Buffer.alloc(msgLen);
        data.copy(payload, 0, 24);
        const checksumCalc = messageChecksum(payload);
        if (checksum != checksumCalc.readUInt32BE(0)) {
            console.log('Supplied checksum of ' + checksum.toString(16) + ' does not match calculated checksum of ' + checksumCalc.toString('hex'));
        }
    } else {
        payload = Buffer.alloc(0);
    }
    return {
        command: cmd,
        bufferPayload: payload
    };
}