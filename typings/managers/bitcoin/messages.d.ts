declare type versionMessageData = {
    version: number,
    services: Service,
    timestamp: number,
    addr_recv: number,
    addr_from: number,
    nonce: number
    user_agent: string,
    start_height: number,
}

declare enum Service {
    NODE_NETWORK = 1,
    NODE_GETUTXO = 2,
    NODE_BLOOM = 4,
    NODE_WITNESS = 8,
    NODE_NETWORK_LIMITED = 1024,
}