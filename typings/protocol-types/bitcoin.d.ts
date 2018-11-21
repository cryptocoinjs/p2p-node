type ParseResult<V, O> = {
    value: V,
    offset: O,
}

declare const Str: {
    makeVarStr: (str: string) => Buffer,
    makeSizedStr: (size: number) => (str: string) => Buffer,
    makeStr12: (str: string) => Buffer,
    makeStr32: (str: string) => Buffer,
    parseChars: (sizeInBytes: number) => (data: Buffer, pointer?: number) => ParseResult<string, number>,
    parseVarStr: (data: Buffer, pointer?: number) => ParseResult<string, number>
};

declare const Int: {
    makeUint8: (fill: number) => Buffer,
    makeUint16: (fill: number) => Buffer,
    makeUint32: (fill: number) => Buffer,
    makeUint64: (fill: number) => Buffer,
    makeVarUint: (fill: number) => Buffer
    parseUint8: (data: Buffer, pointer?: number) => ParseResult<number, 8>,
    parseUint16: (data: Buffer, pointer?: number) => ParseResult<number, 16>,
    parseUint32: (data: Buffer, pointer?: number) => ParseResult<number, 32>,
    parseUint64: (data: Buffer, pointer?: number) => ParseResult<number, 64>
    parseVarSizeInt: (data: Buffer, pointer?: number) => ParseResult<number, number>
};