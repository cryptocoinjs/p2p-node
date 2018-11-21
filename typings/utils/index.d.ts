declare const dSha256: (data: string | Buffer | NodeJS.TypedArray | DataView) => Buffer;

declare const messageChecksum: (data: Buffer) => Buffer;

interface CancelableFunction extends Function {
    cancel: () => void
}

declare const hexToString: (hexString: string) => string