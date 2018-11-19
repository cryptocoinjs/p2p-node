declare type Int<Size> = (fill: number) => Buffer;
declare type TypedInt<Size> = (size: Size) => Int<Size>;

declare type Buf<Size> = (data: Buffer, parseOffset?: number) => {
    value: number,
    offset: Size,
};

declare type Char<Size> = (str: string) => Buffer;
declare type TypedChar<Size> = (size: Size) => Char<Size>;

declare type IntMapType = {
    makeUint8: Int<8>
    makeUint16: Int<16>,
    makeUint32: Int<32>,
    makeUint64: Int<64>,
    parseUint8: Buf<8>,
    parseUint16: Buf<16>,
    parseUint32: Buf<32>,
    parseUint64: Buf<64>
    parseVarSizeInt: Buf<number>
};

declare type StrMapType = {
    makeVarStr: Char<number>
    makeSizedStr: TypedChar<number>
    makeStr12: Char<12>
    parseChars: (sizeInBits: number) => (data: Buffer, pointer?: number) => {
        value: string,
        offset: number
    }
};