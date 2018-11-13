const makeShrinkInt: TypedInt<number> = (size) => (fill) => {
    const byteSize = size / 8;
    const data = Buffer.alloc(byteSize);
    if (byteSize === 8) {
        data.fill(0);
    }
    console.log(fill, byteSize);
    data.writeUIntLE(fill, 0, byteSize);
    return data;
};
const makeTypedInt: TypedInt<8 | 16 | 32 | 64> = (size: 8 | 16 | 32 | 64) => makeShrinkInt(size);

export const Int: IntMapType = {
    makeUint8: makeTypedInt(8),
    makeUint16: makeTypedInt(16),
    makeUint32: makeTypedInt(32),
    makeUint64: makeTypedInt(64),
    makeUintX: makeShrinkInt,
};

const makeStr = (str: string): Buffer => {
    const data = Buffer.alloc(str.length);
    for (let i = 0; i < str.length; i++) {
        data[i] = str.charCodeAt(i);
    }
    return data;
};

const makeVarStr = (str: string) => {
    const num = str.length;
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
    const dataBuff = makeStr(str);
    if (prefixBuff) {
        const totalBufferLength = dataBuff.length + valueBuff.length + prefixBuff.length;
        return Buffer.concat([dataBuff, valueBuff, prefixBuff], totalBufferLength);
    }
    const totalBufferLength = dataBuff.length + valueBuff.length;
    return Buffer.concat([valueBuff, dataBuff], totalBufferLength);
};

export const Str: StrMapType = {
    makeVarStr,
};