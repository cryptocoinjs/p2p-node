declare class Peer extends NodeJS.EventEmitter {
    connect(): void;
    disconnect(): void;
    destroy(): void;
    getUUID(): string;
    send(data: Buffer, callback?: Function): void;
}

interface DIPeer {
    new(peerOptions: THostOptions, magic: number): Peer;
}

type THostOptions = {
    host: string;
    port: number;
};

interface IHostOptions extends THostOptions {
    version: number;
}

type MessageData = {
    [props: string]: Buffer
};


declare class Message {
    checksum(): Buffer;
    make(message: MessageData): Buffer;
}

interface DIMessage {
    new(order: string[]): Message;
}

declare class Parser {
    parse(template: Template, message: Buffer): ParseOutput
    currentCursor: number
}

interface DIParser {
    new(order: string[], initialCursor?: number): Parser;
}

type ParseOutput = {
    [props: string]: number | string | Date | Boolean | ParseOutput | ParseOutput[]
}

type SubTemplate = {
    template: Template,
    order: string[]
}

type TemplateProp = ((data: Buffer, pointer?: number) => ParseResult<number | string | Date | Boolean | ParseOutput, number>) | SubTemplate[] | SubTemplate

type Template = {
    [props: string]: TemplateProp,
}