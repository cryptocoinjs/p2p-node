import { EventEmitter } from 'events';
import bind from 'bind-decorator';
import { DIPeer, DIMessage, THostOptions, IPeer, IMessage } from 'interfaces';

type PeerError = {
  peer: IPeer,
  error: Object
}

type PeerMessage = {
  peer: IPeer,
  command: string,
  data: Buffer
}

export class BitcoinPeerManager extends EventEmitter {

  private peerConstructor: DIPeer
  private messageConstructor: DIMessage
  private verackTimeout: NodeJS.Timeout
  private connectTimeout: NodeJS.Timeout
  private currentPeer: IPeer
  private iterate: IterableIterator<void>
  private message: IMessage

  constructor(peerClass: DIPeer, messageClass: DIMessage) {
    super();
    this.peerConstructor = peerClass;
    this.messageConstructor = messageClass;
  }

  @bind
  private handleConnect() {
    console.log('connect');
    clearTimeout(this.connectTimeout);

    this.message.putInt32(70015); // version
    this.message.putInt64(1); // services
    this.message.putInt64(Math.round(new Date().getTime() / 1000)); // timestamp
    this.message.pad(26); // addr_me
    this.message.pad(26); // addr_you
    this.message.putInt64(0x1234); // nonce
    this.message.putVarString('/btc-js-node:0.0.1/');
    this.message.putInt32(10); // start_height

    console.log('Sending VERSION message');
    this.verackTimeout = setTimeout(() => {
      console.log('No VERACK received; disconnect');
      return this.currentPeer.destroy();
    }, 10000);

    this.currentPeer.once('verackMessage', () => {
      console.log('VERACK received; this peer is active now');
      return clearTimeout(this.verackTimeout);
    });

    this.currentPeer.send('version', this.message.raw());
  }

  @bind
  private handleClose() {
    console.log('Connection closed, trying next...');
    setImmediate(() => {
      clearTimeout(this.connectTimeout);
      clearTimeout(this.verackTimeout);
      this.iterate.next();
    });
  }

  @bind
  private handleEnd() { console.log('end') }

  @bind
  private handleError(data: PeerError) {
    console.log('error ', data.error);
    this.currentPeer.destroy();
  }

  @bind
  private handleMessage(data: PeerMessage) {
    console.log('message', data.command, data.data.toString('hex'));
  }

  private *candidateGenerator(peerOptions: THostOptions[]) {
    for (let i = 0; i < peerOptions.length; i++) {
      this.currentPeer = new this.peerConstructor(peerOptions[i])
      yield this.connectToPeer() 
    }
  }

  private connectToPeer() {
    this.connectTimeout = setTimeout(() => { // Give them a few seconds to respond, otherwise close the connection automatically
      console.log('Peer never connected; hanging up');
      this.currentPeer.destroy();
      this.currentPeer.removeAllListeners();
      this.iterate.next();
    }, 5 * 1000);

    this.currentPeer.on('connect', this.handleConnect);
    this.currentPeer.on('end', this.handleEnd);
    this.currentPeer.on('error', this.handleError);
    this.currentPeer.on('close', this.handleClose);
    this.currentPeer.on('message', this.handleMessage);

    console.log('Attempting connection to ' + this.currentPeer.getUUID());

    this.currentPeer.connect();
  }

  public connect(peerOptions: THostOptions[]) {
    console.log('connect to peers ... ')
    this.iterate = this.candidateGenerator(peerOptions);
    this.message = new this.messageConstructor()
    this.iterate.next();
  }

  public disconnect(cb: () => void) {
    this.currentPeer.removeListener('close', this.handleClose)
    const watchdog = setTimeout(() => {
      console.log('Peer didn\'t close gracefully; force-closing');
      this.currentPeer.destroy();
      this.iterate = null;
      this.currentPeer.removeAllListeners();
      cb()
    }, 10000);
    watchdog.unref();
    this.currentPeer.once('close', () => {
      clearTimeout(watchdog);
      this.currentPeer.removeAllListeners();
      this.iterate = null;
      cb()
    });
    this.currentPeer.disconnect();
  }

}