declare class BitcoinPeerManager extends NodeJS.EventEmitter {
    connect(peerOptions: THostOptions[]): void;
    disconnect(cb: () => void): void;
}