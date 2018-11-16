import { dSha256 } from '../utils';

export class Message {

  private buffer = Buffer.alloc(10000);
  private cursor = 0;
  private parseOrder: string[];

  constructor(order: string[]) {
    this.parseOrder = order;
  }

  private put(data: Buffer) {
    if (data) {
      data.copy(this.buffer, this.cursor);
      this.cursor += data.length;
    }
    return this;
  }

  private raw() {
    const data = Buffer.alloc(this.cursor);
    this.buffer.copy(data, 0, 0, this.cursor);
    return data;
  }

  public checksum() {
      return Buffer.from(dSha256(this.buffer.slice(0, this.cursor)));
  }

  public make(message: MessageData) {
    this.reset();
    this.parseOrder.forEach((key) => {
      this.put(message[key]);
    });
    return this.raw();
  }

  private reset() {
    this.buffer = Buffer.alloc(10000);
    this.cursor = 0;
  }
}