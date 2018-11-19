export enum Service {
    NODE_NETWORK = 1,
    NODE_GETUTXO = 2,
    NODE_BLOOM = 4,
    NODE_WITNESS = 8,
    NODE_NETWORK_LIMITED = 1024,
}

export enum InvVectors {
    ERROR = 0,
    MSG_TX = 1,
    MSG_BLOCK = 2,
    MSG_FILTERED_BLOCK = 3,
    MSG_CMPCT_BLOCK = 4
}