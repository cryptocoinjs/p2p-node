declare class Peer extends NodeJS.EventEmitter {
    connect(): void;
    disconnect(): void;
    destroy(): void;
    getUUID(): string;
    send(command: string, data: Buffer, callback?: Function): void;
}

declare interface DIPeer {
    new(peerOptions: THostOptions): Peer;
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