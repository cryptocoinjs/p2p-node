import { EventEmitter } from 'events';
import { DIPeer, DIMessage, THostOptions, IPeer, IMessage } from 'interfaces';

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

  private *candidateGenerator(peerOptions: THostOptions[]) {
    for (let i = 0; i < peerOptions.length; i++) {
      this.currentPeer = new this.peerConstructor(peerOptions[i])
      yield this.connectToPeer() 
    }
  }

  public connect(peerOptions: THostOptions[]) {
    this.iterate = this.candidateGenerator(peerOptions);
    this.message = new this.messageConstructor()
  }

  public disconnect() {
    const watchdog = setTimeout(function () {
      console.log('Peer didn\'t close gracefully; force-closing');
      this.currentPeer.destroy();
      this.iterate = null;
    }, 10000);
    watchdog.unref();
    this.currentPeer.once('close', function () {
      clearTimeout(watchdog);
      this.iterate = null;
    });
    this.currentPeer.disconnect();
  }

  private connectToPeer() {
    this.connectTimeout = setTimeout(function () { // Give them a few seconds to respond, otherwise close the connection automatically
      console.log('Peer never connected; hanging up');
      this.currentPeer.destroy();
      this.currentPeer.removeAllListeners();
    }, 5 * 1000);

    this.currentPeer.on('connect', () => this.handleConnect());
    this.currentPeer.on('end', () => console.log('end'));
    this.currentPeer.on('error', ({ peer, error }) => {
      console.log('error ', error);
      peer.destroy();
    });
    this.currentPeer.on('close', () => {
      console.log('Connection closed, trying next...');
      setImmediate(function () {
        clearTimeout(this.connectTimeout);
        clearTimeout(this.verackTimeout);
        this.iterate.next();
      });
    });
    this.currentPeer.on('message', function (d) {
      console.log('message', d.command, d.data.toString('hex'));
    });

    console.log('Attempting connection to ' + this.currentPeer.getUUID());

    this.currentPeer.connect();
  }
}