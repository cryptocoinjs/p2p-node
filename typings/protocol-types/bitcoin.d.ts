declare type Int<Size> = (fill: number) => Buffer;
declare type TypedInt<Size> = (size: Size) => Int<Size>;

declare type IntMapType = {
    makeUint8: Int<8>
    makeUint16: Int<16>,
    makeUint32: Int<32>,
    makeUint64: Int<64>,
    makeUintX: TypedInt<number>,
};

declare type StrMapType = {
    makeVarStr: (str: string) => Buffer;
};