'use strict';

import { Int, Str } from '../../../protocol-types/bitcoin';



export function parse(data: Buffer) {
    const addresses = [];
    let pointer: number;
    const { value: count, offset } = Int.parseVarSizeInt(data);
    pointer = offset;
    for (var i = 0; i < count; i++) {
        let { value: date, offset: timeDelta } = Int.parseUint32(data, pointer);
        const time = new Date(date * 1000);
        pointer += timeDelta;
        const { value: services, offset: servicesDelta}  = Int.parseUint64(data, pointer);
        pointer += servicesDelta;
        const { ips, offset: ipDelta } = parseIP(data, pointer);
        pointer += ipDelta
        const { value: port, offset: portDelta } = Int.parseUint16(data, pointer);
        pointer += portDelta
        addresses.push({
            time,
            services,
            ips,
            port
        });
    }
    return addresses
}

function parseIP(data: Buffer, pointer = 0) {
    const pointerInBytes = pointer / 8
    const ipData = data.slice(pointerInBytes);
    let ipPointer = 0;
    var ipv6 = [];
    var ipv4 = [];
    for (var a = 0; a < 8; a++) {
        const buf = ipData.slice(ipPointer, 2 + ipPointer)
        ipPointer += 2;
        ipv6.push(buf.toString('hex'));
        if (a >= 6) {
            ipv4.push(buf[0]);
            ipv4.push(buf[1]);
        }
    }
    return {
        ips: {
            ipv6: ipv6.join(':'),
            ipv4: ipv4.join('.')
        },
        offset: ipPointer * 8,
    }
}