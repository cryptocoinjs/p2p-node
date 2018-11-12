import { dSha256 } from './dsha256';
import { IMessage } from 'interfaces';

export class Message implements IMessage {

  private buffer = Buffer.alloc(10000);
  private cursor = 0;
  public checksum() { // deprecated
    return Buffer.from(dSha256(this.buffer.slice(0, this.cursor)));
  }
  public raw() {
    const data = Buffer.alloc(this.cursor);
    this.buffer.copy(data, 0, 0, this.cursor);
    return data;
  }
  public pad(size: number) {
    const data = Buffer.alloc(size);
    data.fill(0);
    return this.put(data);
  }
  private put(data: number | Buffer) {
    if (typeof data == 'number' && data <= 255) {
      this.buffer[this.cursor] = data;
      this.cursor += 1;
      return this;
    } else if (data instanceof Buffer) {
      data.copy(this.buffer, this.cursor);
      this.cursor += data.length;
    }
    return this;
  }
  public putInt16(num: number) {
    const data = Buffer.alloc(2);
    data.writeUInt16LE(num, 0);
    return this.put(data);
  }
  public putInt32(num: number) {
    const data = Buffer.alloc(4);
    data.writeUInt32LE(num, 0);
    return this.put(data);
  }
  public putInt64(num: number) {
    const data = Buffer.alloc(8);
    data.fill(0);
    data.writeUInt32LE(num, 0);
    return this.put(data);
  }
  private putString(str: string) {
    const data = Buffer.alloc(str.length);
    for (let i = 0; i < str.length; i++) {
      data[i] = str.charCodeAt(i);
    }
    return this.put(data);
  }
  public putVarInt(num: number) {
    if (num < 0xfd) {
      return this.put(num);
    } else if (num <= 0xffff) {
      return this.put(0xfd).putInt16(num);
    } else if (num <= 0xffffffff) {
      return this.put(0xfe).putInt32(num);
    } else {
      return this.put(0xff).putInt64(num);
    }
  }
  public putVarString(str: string) {
    return this.putVarInt(str.length).putString(str);
  }
}