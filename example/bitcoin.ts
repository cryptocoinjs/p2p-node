import { BitcoinPeerManager, Peer, Message } from '../src';
import * as dns from 'dns'


const peerManager = new BitcoinPeerManager(Peer, Message);

function findPeer(addrs: string[]) {
  peerManager.connect(addrs.map((addr) => ({ host: addr, port: 8333 })))
}

process.once('SIGINT', function () {
  console.log('Got SIGINT; closing...');
  peerManager.disconnect(() => {
    console.log('shutdown')
    process.exit(0)
  });
});


// Find a single IP address
dns.resolve4('seed.btc.petertodd.org', function(err, addrs) {
  if (err) {
    console.log(err);
    return;
  }
  findPeer(addrs);
});
