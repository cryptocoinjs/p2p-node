var Peer = require('../lib/Peer').Peer;
var Message = require('./Message').Message;
var dns = require('dns');
var crypto = require('crypto');

// Resolve DNS seeds
var ipSeeds = [];
var waiting = 2;
dns.resolve4('bootstrap8080.bitmessage.org', function(err, addrs) {
  if (err) {
    console.log(err);
    return;
  }
  for (var i = 0; i < addrs.length; i++) {
    ipSeeds.push(addrs[i]+':8080');
  }
	if (--waiting <= 0) {
		console.log(ipSeeds);
		tryLaunch(ipSeeds);
	}
});
dns.resolve4('bootstrap8444.bitmessage.org', function(err, addrs) {
  if (err) {
    console.log(err);
    return;
  }
  for (var i = 0; i < addrs.length; i++) {
    ipSeeds.push(addrs[i]+':8444');
  }
	if (--waiting <= 0) {
		console.log(ipSeeds);
		tryLaunch(ipSeeds);
	}
});

var p = false;
var hangupTimer = false;

function tryLaunch(hosts) {
  clearTimeout(hangupTimer);
  var host = hosts.pop();
  console.log('connecting to '+host);
  p = new Peer(host, 8444, 0xE9BEB4D9);
  
  // Override message checksum to be SHA512
  p.messageChecksum = function(msg) {
    var sha512 = crypto.createHash('sha512');
    sha512.update(msg);
    return sha512.digest().slice(0,4);
  }

  p.on('connect', function(d) {
    console.log('connect');

    // Send VERSION message
    var m = new Message(p.magicBytes, true);
    m.putInt32(2); // version
    m.putInt64(1); // services
    m.putInt64(Math.round(new Date().getTime()/1000)); // timestamp
    m.pad(26); // addr_me
    m.pad(26); // addr_you
    m.putInt64(0x1234); // nonce
    m.putVarString('Node.js lite peer');
    m.putVarInt(1); // number of streams
    m.putVarInt(1); // Stream I care about
  
    console.log(m.raw().toString('hex'));
    // TODO: Bitmessage uses SHA-512 for checksum calculation; make that configurable in Peer
    p.send('version', m.raw());
  });
  p.on('end', function(d) {
    console.log('end');
  });
  p.on('error', function(d) {
    console.log('error', d.error);
    if (hosts.length > 0) tryLaunch(hosts);
  });
  p.on('message', function(d) {
    console.log('message', d.command, d.data.toString('hex'));
  });
  
  p.connect();
  var hangupTimer = setTimeout(function() {
    if (p.state == 'connecting') {
      console.log(p.getUUID()+' is not connecting; hanging up');
      p.destroy();
      if (hosts.length > 0) tryLaunch(hosts);
    }
  }, 5*1000).unref();
}

process.on('SIGINT', function() {
  console.log('Got SIGINT; closing...');
  p.disconnect();
  process.exit(0);
});
