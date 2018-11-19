export const enum PeerStates {
    Initial,
    Connecting,
    Connected,
    Disconnecting,
    Closed,
}

export const MAX_RECEIVE_BUFFER = 1024 * 1024 * 10;