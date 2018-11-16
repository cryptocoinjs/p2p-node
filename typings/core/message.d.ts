declare type MessageData = {
    [props: string]: Buffer
};


declare class Message {
    checksum(): Buffer;
    make(message: MessageData): Buffer;
}

declare interface DIMessage {
    new(order: string[]): Message;
}


