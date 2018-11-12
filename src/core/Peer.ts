import * as net from 'net';
import { EventEmitter } from 'events';
import { dSha256 } from './dsha256';
import { IPeer, PeerStates, THostOptions, IHostOptions } from 'interfaces';

export class Peer extends EventEmitter implements IPeer {

  public MAX_RECEIVE_BUFFER = 1024 * 1024 * 10;

  private host: IHostOptions;
  private state: PeerStates = PeerStates.Initial;
  private socket: net.Socket;
  private inbound: Buffer;
  private inboundCursor: number;
  private lastSeen: Date;
  private magicBytes: number;

  constructor(peerOptions: THostOptions, magic = 0xD9B4BEF9) {
    super();
    this.host = this.generateOptions(peerOptions);
    this.magicBytes = magic;
    this.handleConnect = this.handleConnect.bind(this);
    this.handleError = this.handleError.bind(this);
    this.handleData = this.handleData.bind(this);
    this.handleEnd = this.handleEnd.bind(this);
    this.handleClose = this.handleClose.bind(this);
  }

  private generateOptions(options: THostOptions): IHostOptions {
    return {
      ...options,
      version: net.isIP(options.host),
    };
  }

  private changeState(newState: PeerStates): void {
    const oldState = this.state;
    this.state = newState;
    this.emit('stateChange', { newState, oldState });
  }

  public connect(socket?: net.Socket) {
    this.changeState(PeerStates.Connecting);
    this.inbound = Buffer.alloc(this.MAX_RECEIVE_BUFFER);
    this.inboundCursor = 0;

    this.socket = socket ? socket : net.createConnection(this.host.port, this.host.host, this.handleConnect);

    this.socket.on('error', this.handleError.bind(this));
    this.socket.on('data', this.handleData.bind(this));
    this.socket.on('end', this.handleEnd.bind(this));
    this.socket.on('close', this.handleClose.bind(this));
  }

  public disconnect() {
    this.changeState(PeerStates.Disconnecting);
    this.socket.end(); // Inform the other end we're going away
  }

  public destroy() {
    this.socket.destroy();
  }

  public getUUID() {
    const { host, port } = this.host;
    return `${host}~${port}`;
  }

  protected handleConnect() {
    this.changeState(PeerStates.Connected);
    this.emit('connect', {
      peer: this,
    });
  }

  protected handleEnd() {
    this.emit('end', {
      peer: this,
    });
  }

  protected handleError(error: Object) {
    this.emit('error', {
      peer: this,
      error
    });
  }

  protected handleClose(closeError: Object): Peer {
    this.changeState(PeerStates.Closed);
    this.emit('close', {
      peer: this,
      closeError
    });
    return this;
  }

  private messageChecksum(message: Buffer): Buffer {
    return Buffer.from(dSha256(message)).slice(0, 4);
  }

  public send(command: string, data: Buffer, callback?: Function) {
    const out = Buffer.alloc(data.length + 24);
    out.writeUInt32LE(this.magicBytes, 0); // magic
    for (let i = 0; i < 12; i++) {
      const num = (i >= command.length) ? 0 : command.charCodeAt(i);
      out.writeUInt8(num, 4 + i); // command
    }
    out.writeUInt32LE(data.length, 16); // length
    const checksum = this.messageChecksum(data);
    checksum.copy(out, 20); // checksum
    data.copy(out, 24);

    this.socket.write(out, null, callback);
  }

  protected handleData(data: Buffer) {
    this.lastSeen = new Date();

    // Add data to incoming buffer
    if (data.length + this.inboundCursor > this.inbound.length) {
      this.emit('error', 'Peer exceeded max receiving buffer');
      this.inboundCursor = this.inbound.length + 1;
      return;
    }
    data.copy(this.inbound, this.inboundCursor);
    this.inboundCursor += data.length;

    if (this.inboundCursor < 20) return; // Can't process something less than 20 bytes in size

    // Split on magic bytes into message(s)
    let i = 0, endPoint = 0;
    // console.log('searching for messages in '+this.inboundCursor+' bytes');
    while (i < this.inboundCursor) {
      if (this.inbound.readUInt32LE(i) == this.magicBytes) {
        // console.log('found message start at '+i);
        const msgStart = i;
        if (this.inboundCursor > msgStart + 16) {
          const msgLen = this.inbound.readUInt32LE(msgStart + 16);
          // console.log('message is '+msgLen+' bytes long');
          if (this.inboundCursor >= msgStart + msgLen + 24) {
            // Complete message; parse it
            this.handleMessage(this.inbound.slice(msgStart, msgStart + msgLen + 24));
            endPoint = msgStart + msgLen + 24;
          }
          i += msgLen + 24; // Skip to next message
        } else {
          i = this.inboundCursor; // Skip to end
        }
      } else {
        i++;
      }
    }

    // Done processing all found messages
    if (endPoint > 0) {
      // console.log('messaged parsed up to '+endPoint+', but cursor goes out to '+this.inboundCursor);
      this.inbound.copy(this.inbound, 0, endPoint, this.inboundCursor); // Copy from later in the buffer to earlier in the buffer
      this.inboundCursor -= endPoint;
      // console.log('removed '+endPoint+' bytes processed data, putting cursor to '+this.inboundCursor);
    }
  }

  private handleMessage(msg: Buffer) {
    const msgLen = msg.readUInt32LE(16);

    // Get command
    const commands = [];
    for (let j = 0; j < 12; j++) {
      const s = msg[4 + j];
      if (s > 0) {
        commands.push(String.fromCharCode(s));
      }
    }
    const cmd = commands.join('');
    let payload: Buffer;

    const checksum = msg.readUInt32BE(20);
    if (msgLen > 0) {
      payload = Buffer.alloc(msgLen);
      msg.copy(payload, 0, 24);
      const checksumCalc = this.messageChecksum(payload);
      if (checksum != checksumCalc.readUInt32BE(0)) {
        console.log('Supplied checksum of ' + checksum.toString(16) + ' does not match calculated checksum of ' + checksumCalc.toString('hex'));
      }
    } else {
      payload = Buffer.alloc(0);
    }

    this.emit('message', {
      peer: this,
      command: cmd,
      data: payload
    });
    this.emit(cmd + 'Message', {
      peer: this,
      data: payload
    });
  }

}