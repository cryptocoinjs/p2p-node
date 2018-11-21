import * as net from 'net';
import { EventEmitter } from 'events';
import bind from 'bind-decorator';
import { PeerStates, MAX_RECEIVE_BUFFER } from './constants';

export class Peer extends EventEmitter {

  public MAX_RECEIVE_BUFFER = MAX_RECEIVE_BUFFER;

  private host: IHostOptions;
  private state: PeerStates = PeerStates.Initial;
  private socket: net.Socket;
  private inbound: Buffer;
  private inboundCursor: number;
  private magicBytes: number;

  constructor(peerOptions: THostOptions, magic: number) {
    super();
    this.host = this.generateOptions(peerOptions);
    this.magicBytes = magic;
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

  @bind
  protected handleConnect() {
    this.changeState(PeerStates.Connected);
    this.emit('connect', {
      peer: this,
    });
  }

  @bind
  protected handleEnd() {
    this.emit('end', {
      peer: this,
    });
  }

  @bind
  protected handleError(error: Object) {
    this.emit('error', {
      peer: this,
      error
    });
  }

  @bind
  protected handleClose(closeError: Object): Peer {
    this.changeState(PeerStates.Closed);
    this.emit('close', {
      peer: this,
      closeError
    });
    return this;
  }

  @bind
  protected handleData(data: Buffer) {
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
            this.emit('message', {
              peer: this,
              data: this.inbound.slice(msgStart, msgStart + msgLen + 24)
            });
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

  public send(data: Buffer, callback?: Function) {
    this.socket.write(data, null, callback);
  }

}