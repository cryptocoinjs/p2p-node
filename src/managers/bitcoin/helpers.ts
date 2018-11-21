export function parseIP(data: Buffer, pointer = 0) {
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
        value: {
            ipv6: ipv6.join(':'),
            ipv4: ipv4.join('.')
        },
        offset: ipPointer * 8,
    };
}