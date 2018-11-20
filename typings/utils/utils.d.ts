declare type TdSha256 = (data: string | Buffer | NodeJS.TypedArray | DataView) => Buffer;

declare type TmessageChecksum = (data: Buffer) => Buffer;

declare interface CacelableFunction extends Function {
    cancel: () => void
}

declare type HexToString = (hexString: string) => string