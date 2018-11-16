declare class Peer extends NodeJS.EventEmitter {
    connect(): void;
    disconnect(): void;
    destroy(): void;
    getUUID(): string;
    send(data: Buffer, callback?: Function): void;
}

declare interface DIPeer {
    new(peerOptions: THostOptions, magic: 0xD9B4BEF9 | 0xDAB5BFFA | 0x0709110B | 0xFEB4BEF9): Peer;
}

declare enum PeerStates {
    Initial,
    Connecting,
    Connected,
    Disconnecting,
    Closed,
}

declare type THostOptions = {
    host: string;
    port: number;
};

declare interface IHostOptions extends THostOptions {
    version: number;
}