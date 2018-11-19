import { Int64LE } from 'int64-buffer';

const makeShrinkInt: TypedInt<number> = (size) => (fill) => {
    const byteSize = Math.floor(size / 8);
    const data = Buffer.alloc(byteSize);
    if (byteSize > 6) {
        return new Int64LE(fill).toBuffer();
    }
    data.writeUIntLE(fill, 0, byteSize);
    return data;
};

const makeTypedInt: TypedInt<8 | 16 | 32 | 64> = makeShrinkInt;

const makeUint8: Int<8> = makeTypedInt(8);
const makeUint16: Int<16> = makeTypedInt(16);
const makeUint32: Int<32> = makeTypedInt(32);
const makeUint64: Int<64> = makeTypedInt(64);
const parseUint8: Buf<8> = (data, parseOffset = 0) => ({
    offset: 8,
    value: data.readUIntLE(parseOffset, 1),
});
const parseUint16: Buf<16> = (data, parseOffset = 0) => {
    const parseOffsetInBytes = Math.floor(parseOffset / 8);
    return {
        offset: 16,
        value: data.readUIntLE(parseOffsetInBytes, 2),
    };
};
const parseUint32: Buf<32> = (data, parseOffset = 0) => {
    const parseOffsetInBytes = Math.floor(parseOffset / 8);
    return {
        offset: 32,
        value: data.readUIntLE(parseOffsetInBytes, 4),
    };
};
const parseUint64: Buf<64> = (data, parseOffset = 0) => {
    const parseOffsetInBytes = Math.floor(parseOffset / 8);
    const dataToParse = data.slice(parseOffsetInBytes);
    return {
        offset: 64,
        value: new Int64LE(dataToParse).toNumber(),
    };
};

const parseVarSizeInt: Buf<number> = (vatInt, parseOffset = 0) => {
    const parseOffsetInBytes = Math.floor(parseOffset / 8);
    const { value, offset } = parseUint8(vatInt, parseOffsetInBytes);
    let baseOffset = 8;
    let parser: Buf<8 | 16 | 32 | 64>;
    switch (value) {
        case 0xFD:
            parser = parseUint16;
            break;
        case 0xFE:
            parser = parseUint32;
            break;
        case 0xFF:
            parser = parseUint64;
            break;
        default:
            parser = parseUint8;
            baseOffset = 0;
            break;
    }
    const data = vatInt.slice(baseOffset / 8);
    const invData = parser(data);
    return {
        value: invData.value,
        offset: invData.offset + baseOffset
    };
};

const makeVarIntDestruct = (num: number) => {
    let prefixBuff: Buffer;
    let valueBuff: Buffer;
    if (num < 0xfd) {
        prefixBuff = null;
        valueBuff = Int.makeUint8(num);
    } else if (num <= 0xffff) {
        prefixBuff = Buffer.alloc(1, 0xfd);
        valueBuff = Int.makeUint16(num);
    } else if (num <= 0xffffffff) {
        prefixBuff = Buffer.alloc(1, 0xfe);
        valueBuff = Int.makeUint32(num);
    } else {
        prefixBuff = Buffer.alloc(1, 0xff);
        valueBuff = Int.makeUint64(num);
    }
    return {
        prefixBuff,
        valueBuff,
    }
}

const makeVarUint: Int<number> = (value) => {
    const { prefixBuff, valueBuff } = makeVarIntDestruct(value)
    if (prefixBuff) {
        const totalBufferLength = valueBuff.length + prefixBuff.length;
        return Buffer.concat([valueBuff, prefixBuff], totalBufferLength);
    }
    return valueBuff;
}

export const Int: IntMapType = {
    makeUint8,
    makeUint16,
    makeUint32,
    makeUint64,
    makeVarUint,
    parseUint8,
    parseUint16,
    parseUint32,
    parseUint64,
    parseVarSizeInt,
};

const makeSizedStr: TypedChar<number> = (size) => (str) => {
    const data = Buffer.alloc(size);
    const maxIndex = Math.min(size, str.length);
    for (let i = 0; i < maxIndex; i++) {
        data[i] = str.charCodeAt(i) || 0;
    }
    return data;
};

const makeVarStr: Char<number> = (str) => {
    const num = str.length;
    const { prefixBuff, valueBuff } = makeVarIntDestruct(num)
    const dataBuff = makeSizedStr(num)(str);
    if (prefixBuff) {
        const totalBufferLength = dataBuff.length + valueBuff.length + prefixBuff.length;
        return Buffer.concat([dataBuff, valueBuff, prefixBuff], totalBufferLength);
    }
    const totalBufferLength = dataBuff.length + valueBuff.length;
    return Buffer.concat([valueBuff, dataBuff], totalBufferLength);
};

const parseChars: BufToStr = (size) => (data, pointer = 0) => {
    const parseOffsetInBytes = Math.floor(pointer / 8);
    const value = Buffer.alloc(size / 8);
    data.copy(value, 0, parseOffsetInBytes, parseOffsetInBytes + size / 8);
    return {
        value: value.toString('hex'),
        offset: size,
    };
}

const parseVarStr: BufToVarStr = (data, pointer = 0) => {
    const parseOffsetInBytes = Math.floor(pointer / 8);
    const internalData = Buffer.alloc(data.length - parseOffsetInBytes);
    data.copy(internalData, 0, parseOffsetInBytes);
    let internalPointer = 0;
    const { value: size, offset: sizeOffset } = Int.parseVarSizeInt(internalData, internalPointer);
    internalPointer += sizeOffset;
    const { value: str, offset: strOffset } = parseChars(size * 8)(internalData, internalPointer)
    internalPointer += strOffset;
    return {
        value: str,
        offset: internalPointer,
    }
}

const makeStr12: Char<12> = makeSizedStr(12);
const makeStr32: Char<32> = makeSizedStr(32);

export const Str: StrMapType = {
    makeVarStr,
    makeSizedStr,
    makeStr12,
    makeStr32,
    parseChars,
    parseVarStr
};