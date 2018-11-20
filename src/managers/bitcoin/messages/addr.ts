'use strict';

import { Int } from '../../../protocol-types/bitcoin';



export function parse(data: Buffer) {
    const addresses = [];
    let pointer: number;
    const { value: count, offset } = Int.parseVarSizeInt(data);
    pointer = offset;
    for (let i = 0; i < count; i++) {
        const { value: addrData, offset: addrOffset } = parseAddr(data, pointer);
        pointer += addrOffset;
        addresses.push(addrData);
    }
    return addresses;
}

export function parseAddr(data: Buffer, pointer: number, isVersionMessage = false) {
    const pointerInBytes = pointer / 8;
    const addrData = data.slice(pointerInBytes);
    let internalPointer = 0;
    let time: Date;
    if (!isVersionMessage) {
        const { value: date, offset: timeDelta } = Int.parseUint32(addrData, internalPointer);
        time = new Date(date * 1000);
        internalPointer += timeDelta;
    }
    const { value: services, offset: servicesDelta } = Int.parseUint64(addrData, internalPointer);
    internalPointer += servicesDelta;
    const { ips, offset: ipDelta } = parseIP(addrData, internalPointer);
    internalPointer += ipDelta;
    const { value: port, offset: portDelta } = Int.parseUint16(addrData, internalPointer);
    internalPointer += portDelta;
    return {
        value: {
            time,
            services,
            ips,
            port,
        },
        offset: internalPointer,
    }
}

function parseIP(data: Buffer, pointer = 0) {
    const pointerInBytes = pointer / 8;
    const ipData = data.slice(pointerInBytes);
    let ipPointer = 0;
    const ipv6 = [];
    const ipv4 = [];
    for (let a = 0; a < 8; a++) {
        const buf = ipData.slice(ipPointer, 2 + ipPointer);
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
    };
}