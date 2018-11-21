import { BitcoinPeerManager, Peer, Parser, Message } from './';
import { Magic } from './constants/bitcoin.constants';
import * as dns from 'dns';


const peerManager = new BitcoinPeerManager(Peer, Message, Parser, Magic.main);

function findPeer(addrs: string[]) {
    peerManager.connect(addrs.map((addr) => ({ host: addr, port: 8333 })));
}

process.once('SIGINT', function () {
    console.log('Got SIGINT; closing...');
    peerManager.disconnect(() => {
        console.log('shutdown');
        process.exit(0);
    });
});


// Find a single IP address
dns.resolve4('seed.btc.petertodd.org', function (err, addrs) {
    if (err) {
        console.log(err);
        return;
    }
    setTimeout(() => {
        findPeer(['54.169.37.203']);
    }, 5000);
});
