import { Peer, Message } from 'core';
import { EventEmitter } from 'events';


// TODO: move to IoC and DI
class BitcoinPeerManager extends EventEmitter {
  constructor() {
    super();
  }

  private handleConnect(peer: Peer, connectTimeout: NodeJS.Timeout, ) {
    console.log('connect');
    clearTimeout(connectTimeout);

    // Send VERSION message
    const m = new Message();
    m.putInt32(70015); // version
    m.putInt64(1); // services
    m.putInt64(Math.round(new Date().getTime() / 1000)); // timestamp
    m.pad(26); // addr_me
    m.pad(26); // addr_you
    m.putInt64(0x1234); // nonce
    m.putVarString('/btc-js-node:0.0.1/');
    m.putInt32(10); // start_height

    console.log('Sending VERSION message');
    const verackTimeout = setTimeout(() => {
      console.log('No VERACK received; disconnect');
      return peer.destroy();
    }, 10000);

    peer.once('verackMessage', () => {
      console.log('VERACK received; this peer is active now');
      return clearTimeout(verackTimeout);
    });

    peer.send('version', m.raw());
  }

  public connect(currentPeer: Peer) {

    const connectTimeout = setTimeout(function () { // Give them a few seconds to respond, otherwise close the connection automatically
      console.log('Peer never connected; hanging up');
      currentPeer.destroy();
      currentPeer.removeAllListeners();
      currentPeer = null;
    }, 5 * 1000);

    currentPeer.on('connect', ({ peer }) => this.handleConnect(peer, connectTimeout));
    currentPeer.on('end', () => console.log('end'));
    currentPeer.on('error', ({ peer, error }) => {
      console.log('error ', error);
      peer.destroy();
    });
    currentPeer.on('close', () => console.log('close'));
    currentPeer.on('message', function (d) {
      console.log('message', d.command, d.data.toString('hex'));
    });

    console.log('Attempting connection to ' + currentPeer.getUUID());

    currentPeer.connect();

    process.once('SIGINT', function () {
      console.log('Got SIGINT; closing...');
      const watchdog = setTimeout(function () {
        console.log('Peer didn\'t close gracefully; force-closing');
        currentPeer.destroy();
      }, 10000);
      watchdog.unref();
      currentPeer.once('close', function () {
        clearTimeout(watchdog);
      });
      currentPeer.disconnect();
      process.once('SIGINT', function () {
        console.log('Hard-kill');
        process.exit(0);
      });
    });
  }
}

// // Find a single IP address
// dns.resolve4('seed.btc.petertodd.org', function(err, addrs) {
//   if (err) {
//     console.log(err);
//     return;
//   }
//   findPeer(addrs);
// });