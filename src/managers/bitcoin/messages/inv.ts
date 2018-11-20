import { Int, Str } from '../../../protocol-types/bitcoin';

export function parse(data: Buffer) {
    const inventory = [];
    let pointer: number;


    const { value, offset } = Int.parseVarSizeInt(data);
    pointer = offset;
    for (let i = 0; i < value; i++) {
        const type = Int.parseUint32(data, pointer);
        pointer += type.offset;
        const hash = Str.parseChars(256)(data, pointer);
        pointer += hash.offset;
        inventory.push({ type: type.value, hash: hash.value });
    }
    return inventory;
}