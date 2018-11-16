declare type versionMessageData = {
    version: number,
    services: Service,
    timestamp: number,
    addr_recv: Buffer,
    addr_from: Buffer,
    nonce: number
    user_agent: string,
    start_height: number,
}

declare type messageHead = {
    magic: number,
    command: string,
    length: number,
    checksum: Buffer,
    payload: Buffer
}

declare type PingPongMessage = {
    nonce: number
}

declare enum Service {
    NODE_NETWORK = 1,
    NODE_GETUTXO = 2,
    NODE_BLOOM = 4,
    NODE_WITNESS = 8,
    NODE_NETWORK_LIMITED = 1024,
}

declare type PeerError = {
    peer: Peer,
    error: Object
};

declare type PeerMessage = {
    peer: Peer,
    data: Buffer
};

declare type PayloadParserByCommands = {
    [props: string]: (bufferPayload: Buffer) => any
};