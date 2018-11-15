declare type MessageData = {
    [props: string]: Buffer
};


declare class Message {
    checksum(): Buffer;
    make(message: MessageData): Buffer;
    parse(): Object;
}

declare interface DIMessage {
    new(order: string[]): Message;
}


