import { Int, Str } from '../../../protocol-types/bitcoin';

const mainOrder = ['inventory'];

const parseInvMsgOrder = ['type', 'hash'];

const parseInvMsgTemplate = {
    type: Int.parseUint32,
    hash: Str.parseChars(32),
};

export function parse(Parser: DIParser, data: Buffer) {
    const { value, offset } = Int.parseVarSizeInt(data);
    const template = {
        inventory: Array.from({ length: value }, () => ({
            template: parseInvMsgTemplate,
            order: parseInvMsgOrder
        }))
    };
    const inventoryMsgParser = new Parser(mainOrder);
    return <ParseOutput[]>inventoryMsgParser.parse(template, data.slice(Math.floor(offset / 8))).inventory;
}