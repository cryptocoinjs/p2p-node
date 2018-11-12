import { EventEmitter } from "events";
import * as net from 'net';

export interface IMessage {
    checksum(): Buffer
    raw(): Buffer
    pad(size: number): IMessage
    put(data: number | Buffer): IMessage
    putInt16(num: number): IMessage
    putInt32(num: number): IMessage
    putInt64(num: number): IMessage
    putString(str: string): IMessage
    putVarInt(num: number): IMessage
    putVarString(str: string): IMessage
}

export interface DIMessage {
    new(): IMessage
}

export interface IPeer extends EventEmitter {
    connect(): void
    disconnect(): void
    destroy(): void
    getUUID(): string
    send(command: string, data: Buffer, callback?: Function): void
}

export interface DIPeer {
    new(peerOptions: THostOptions): IPeer
}

export enum PeerStates {
    Initial,
    Connecting,
    Connected,
    Disconnecting,
    Closed,
}

export type THostOptions = {
    host: string;
    port: number;
}

export interface IHostOptions extends THostOptions {
    version: number;
}

export type TdSha256 = (data: string | Buffer | NodeJS.TypedArray | DataView) => Buffer