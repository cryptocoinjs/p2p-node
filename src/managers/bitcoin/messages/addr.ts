'use strict';
import { parseIP } from '../helpers';
import { Int } from '../../../protocol-types/bitcoin';

const mainOrder = ['addresses'];

const subTemplateOrder = ['time', 'services', 'ips', 'port'];
const subTemplate = {
    time: Int.parseUint32,
    services: Int.parseUint64,
    ips: parseIP,
    port: Int.parseUint16,
};

export function parse(Parser: DIParser, data: Buffer) {
    const { value: count, offset } = Int.parseVarSizeInt(data);

    const template = {
        addresses: Array.from({ length: count }, () => ({
            order: subTemplateOrder,
            template: subTemplate,
        }))
    };

    const parser = new Parser(mainOrder, offset);
    const result = parser.parse(template, data);
    return Object.assign(result, {
        time: new Date(<number>result.time)
    });
}