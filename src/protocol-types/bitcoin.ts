import { Int64LE } from 'int64-buffer';

type TypedInt<Size extends number> = (size: Size) => (fill: number) => Buffer;

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

const makeUint8 = makeTypedInt(8);
const makeUint16 = makeTypedInt(16);
const makeUint32 = makeTypedInt(32);
const makeUint64 = makeTypedInt(64);

const parseUint8:(data: Buffer, pointer?: number) => ParseResult<number, 8> = (data: Buffer, parseOffset = 0) => ({
    offset: 8,
    value: data.readUIntLE(parseOffset, 1),
});

const parseUint16: (data: Buffer, pointer?: number) => ParseResult<number, 16> = (data: Buffer, parseOffset = 0) => {
    const parseOffsetInBytes = Math.floor(parseOffset / 8);
    return {
        offset: 16,
        value: data.readUIntLE(parseOffsetInBytes, 2),
    };
};

const parseUint32: (data: Buffer, pointer?: number) => ParseResult<number, 32> = (data: Buffer, parseOffset = 0) => {
    const parseOffsetInBytes = Math.floor(parseOffset / 8);
    return {
        offset: 32,
        value: data.readUIntLE(parseOffsetInBytes, 4),
    };
};

const parseUint64: (data: Buffer, pointer?: number) => ParseResult<number, 64> = (data: Buffer, parseOffset = 0) => {
    const parseOffsetInBytes = Math.floor(parseOffset / 8);
    const dataToParse = data.slice(parseOffsetInBytes);
    return {
        offset: 64,
        value: new Int64LE(dataToParse).toNumber(),
    };
};

const parseVarSizeInt = (varInt: Buffer, parseOffset = 0) => {
    const parseOffsetInBytes = Math.floor(parseOffset / 8);
    const { value, offset } = parseUint8(varInt, parseOffsetInBytes);
    let baseOffset = 8;
    let parser: (varInt: Buffer, pointer?: number) => ParseResult<number, 8 | 16 | 32 | 64>;
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
    const data = varInt.slice(baseOffset / 8);
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
    };
};

const makeVarUint = (value: number) => {
    const { prefixBuff, valueBuff } = makeVarIntDestruct(value);
    if (prefixBuff) {
        const totalBufferLength = valueBuff.length + prefixBuff.length;
        return Buffer.concat([valueBuff, prefixBuff], totalBufferLength);
    }
    return valueBuff;
};

export const Int = {
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

const makeSizedStr = (size: number) => (str: string) => {
    const data = Buffer.alloc(size);
    const maxIndex = Math.min(size, str.length);
    for (let i = 0; i < maxIndex; i++) {
        data[i] = str.charCodeAt(i) || 0;
    }
    return data;
};

const makeVarStr = (str: string) => {
    const num = str.length;
    const { prefixBuff, valueBuff } = makeVarIntDestruct(num);
    const dataBuff = makeSizedStr(num)(str);
    if (prefixBuff) {
        const totalBufferLength = dataBuff.length + valueBuff.length + prefixBuff.length;
        return Buffer.concat([dataBuff, valueBuff, prefixBuff], totalBufferLength);
    }
    const totalBufferLength = dataBuff.length + valueBuff.length;
    return Buffer.concat([valueBuff, dataBuff], totalBufferLength);
};

const parseChars = (sizeInBytes: number) => (data: Buffer, pointer = 0) => {
    const parseOffsetInBytes = Math.floor(pointer / 8);
    const value = Buffer.alloc(sizeInBytes);
    data.copy(value, 0, parseOffsetInBytes, parseOffsetInBytes + sizeInBytes);
    return {
        value: value.toString('hex'),
        offset: sizeInBytes * 8,
    };
};

const parseVarStr = (data: Buffer, pointer = 0) => {
    const parseOffsetInBytes = Math.floor(pointer / 8);
    const internalData = Buffer.alloc(data.length - parseOffsetInBytes);
    data.copy(internalData, 0, parseOffsetInBytes);
    let internalPointer = 0;
    const { value: size, offset: sizeOffset } = Int.parseVarSizeInt(internalData, internalPointer);
    internalPointer += sizeOffset;
    const { value: str, offset: strOffset } = parseChars(size)(internalData, internalPointer);
    internalPointer += strOffset;
    return {
        value: str,
        offset: internalPointer,
    };
};

const makeStr12 = makeSizedStr(12);
const makeStr32 = makeSizedStr(32);

export const Str = {
    makeVarStr,
    makeSizedStr,
    makeStr12,
    makeStr32,
    parseChars,
    parseVarStr
};
