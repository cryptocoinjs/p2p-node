
declare module 'crypto-hashing' {
    export function cryptoHash(algorithm: string, buffer: Buffer): string
}

declare interface IHostOptions {
    host: string;
    port: number;
}

declare interface IFullHostOptions extends IHostOptions {
    version: number;
}

