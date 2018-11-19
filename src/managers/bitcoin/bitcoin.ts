import { EventEmitter } from 'events';
import bind from 'bind-decorator';
import * as version from './messages/version';
import * as head from './messages/head';
import * as inv from './messages/inv';
import * as pingPong from './messages/ping-pong';
import * as addr from './messages/addr';
import * as getData from './messages/getData';
import { messageChecksum, debounce, getNonce } from '../../utils';
import { Service } from './constants';
import { Magic } from '../../constants/bitcoin.constants';

const payloadParserByCommands: PayloadParserByCommands = {
  version: function (bufferPayload: Buffer) { return version.parse(bufferPayload); },
  verack: function (bufferPayload: Buffer) { return bufferPayload.toString('hex'); },
  inv: function (bufferPayload: Buffer) { return inv.parse(bufferPayload); },
  ping: function (bufferPayload: Buffer) { return pingPong.parse(bufferPayload); },
  pong: function (bufferPayload: Buffer) { return pingPong.parse(bufferPayload); },
  addr: function (bufferPayload: Buffer) { return addr.parse(bufferPayload); },
};

export class BitcoinPeerManager extends EventEmitter {

  private Peer: DIPeer;
  private Message: DIMessage;
  private verackTimeout: NodeJS.Timeout;
  private connectTimeout: NodeJS.Timeout;
  private pingPongTimeout: NodeJS.Timeout;
  private terminateTimeout: NodeJS.Timeout;
  private debouncedPing: CacelableFunction;
  private currentPeer: Peer;
  private iterate: IterableIterator<void>;
  private magicBytes: Magic;
  private nonce: number;

  constructor(peerClass: DIPeer, messageClass: DIMessage, magic: Magic = Magic.main) {
    super();
    this.Peer = peerClass;
    this.Message = messageClass;
    this.magicBytes = magic;
    this.subscribe();
  }

  @bind
  private handleConnect() {
    console.log('connect');
    clearTimeout(this.connectTimeout);

    this.nonce = getNonce();
    this.trackVerack();
    this.once('version', () => this.send(null, 'verack'));
    this.debouncedPing = debounce(this.updatePing, 30000);

    const versionPayload = version.makeBy(this.Message, {
      version: 70015,
      services: Service.NODE_NETWORK,
      timestamp: Math.round(new Date().getTime() / 1000),
      addr_from: Buffer.alloc(26, 0),
      addr_recv: Buffer.alloc(26, 0),
      nonce: this.nonce,
      user_agent: '/btc-js-node:0.0.1/',
      start_height: 10
    });
    this.send(versionPayload);
  }

  private trackVerack() {
    this.verackTimeout = setTimeout(() => {
      console.log('No VERACK received; disconnect');
      return this.currentPeer.destroy();
    }, 10000);

    this.once('verack', () => {
      console.log('VERACK received; this peer is active now');
      return clearTimeout(this.verackTimeout);
    });
  }

  private subscribe() {

    this.on('ping', ({ bufferPayload }) => {
      this.send(bufferPayload, 'pong');
    });

    this.on('pong', ({ payload: nonce }) => {
      if (this.nonce !== nonce) {
        this.terminateCurrentPeer();
      }
    });

    this.on('inv', ({ payload: invData, bufferPayload }) => {
      // const getDataMsg = getData.makeBy(this.Message, invData)
      // currently get all info about txs and blocks
      // TODO: add filter
      this.send(bufferPayload, 'getdata');
    });
  }

  private send(payloadData: Buffer, command = 'version') {
    console.log(`Sending ${command.toUpperCase()} message`);
    const message = head.makeBy(this.Message, {
      magic: this.magicBytes,
      command,
      length: payloadData ? payloadData.length : 0,
      checksum: payloadData ? messageChecksum(payloadData) : Buffer.alloc(4, 0),
      payload: payloadData
    });
    this.currentPeer.send(message);
  }

  private ping() {
    console.log('ping');
    const pongMsg = pingPong.makeBy(this.Message, { nonce: this.nonce });
    this.send(pongMsg, 'ping');
  }

  @bind
  private updatePing() {
    console.log('update ping tracking');
    clearTimeout(this.terminateTimeout);
    clearTimeout(this.pingPongTimeout);
    this.pingPongTimeout = setTimeout(() => {
      this.ping();
      this.terminateTimeout = setTimeout(this.terminateCurrentPeer, 5000);
      return this.terminateTimeout;
    }, 20000);
  }

  @bind
  private terminateCurrentPeer() {
    console.log('terminate connection');
    this.currentPeer.destroy();
    setImmediate(() => {
      this.clearTimers();
      this.currentPeer.removeAllListeners();
      this.iterate.next();
    });
  }

  @bind
  private handleClose() {
    console.log('handleClose')
    setImmediate(() => {
      this.clearTimers();
      this.iterate.next();
    });
  }

  @bind
  private clearTimers() {
    console.log('clearTimers')
    clearTimeout(this.connectTimeout);
    clearTimeout(this.verackTimeout);
    clearTimeout(this.pingPongTimeout);
    clearTimeout(this.terminateTimeout);
    this.debouncedPing.cancel && this.debouncedPing.cancel();
  }

  @bind
  private handleEnd() { console.log('end'); }

  @bind
  private handleError(data: PeerError) {
    console.log('error ', data.error);
    this.currentPeer.destroy();
  }

  @bind
  private handleMessage({ data }: PeerMessage) {
    console.log('handleMessage')
    this.debouncedPing();
    const { command, bufferPayload } = head.parse(data);
    const payload = payloadParserByCommands[command] ? payloadParserByCommands[command].call(this, bufferPayload) : '';
    console.log(`emit command ${command}, payload: ${JSON.stringify(payload)}`);
    this.emit(`${command}`, {
      payload,
      bufferPayload,
    });
  }

  private *candidateGenerator(peerOptions: THostOptions[]) {
    for (let i = 0; i < peerOptions.length; i++) {
      this.currentPeer = new this.Peer(peerOptions[i], this.magicBytes);
      yield this.connectToPeer();
    }
  }

  private connectToPeer() {
    console.log('Attempting connection to ' + this.currentPeer.getUUID());
    this.connectTimeout = setTimeout(() => { // Give them a 11 seconds to respond, otherwise close the connection automatically
      console.log('Peer never connected; hanging up');
      this.terminateCurrentPeer();
    }, 11000);

    this.currentPeer.on('connect', this.handleConnect);
    this.currentPeer.on('end', this.handleEnd);
    this.currentPeer.on('error', this.handleError);
    this.currentPeer.on('close', this.handleClose);
    this.currentPeer.on('message', this.handleMessage);

    this.currentPeer.connect();
  }

  public connect(peerOptions: THostOptions[]) {
    console.log('connect to peers ... ');
    this.iterate = this.candidateGenerator(peerOptions);
    this.iterate.next();
  }

  public disconnect(cb: () => void) {
    console.log('safely disconnect');

    this.currentPeer.removeListener('close', this.handleClose);
    this.clearTimers();
    
    const watchdog = setTimeout(() => {
      console.log('disconnect -> Peer didn\'t close gracefully; force-closing');
      this.currentPeer.destroy();
      this.iterate = null;
      this.currentPeer.removeAllListeners();
      cb();
    }, 10000);
    watchdog.unref();
    this.currentPeer.once('close', () => {
      console.log('disconnect -> close')
      clearTimeout(watchdog);
      this.currentPeer.removeAllListeners();
      this.iterate = null;
      cb();
    });
    this.currentPeer.disconnect();
    this.removeAllListeners();
  }

}