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
var shutdown = false;
var hangupTimer = false;
var verackTimer = false;

function tryLaunch(hosts) {
  if (hosts.length == 0) {
    console.log('out of potential connections...');
    return;
  }
  console.log('Finding new peer from pool of '+hosts.length+' potential peers');
  p = new Peer(hosts.pop(), 8444, 0xE9BEB4D9);
  console.log('connecting to '+p.getUUID());
  
  var hangupTimer = setTimeout(function() { // Give them a few seconds to respond, otherwise close the connection automatically
    console.log('Peer never connected; hanging up');
    p.destroy();
  }, 5*1000);
  hangupTimer.unref();

  // Override message checksum to be SHA512
  p.messageChecksum = function(msg) {
    var sha512 = crypto.createHash('sha512');
    sha512.update(msg);
    return sha512.digest().slice(0,4);
  }

  p.on('connect', function(d) {
    console.log('connect');
    clearTimeout(hangupTimer);

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
  
    //console.log(m.raw().toString('hex'));
    console.log('Sending VERSION message');
    verackTimeout = setTimeout(function() {
      console.log('No VERACK received; disconnect');
      p.destroy();
    }, 10000);
    verackTimeout.unref();
    p.once('verackMessage', function() {
      console.log('VERACK received; this peer is active now');  
      clearTimeout(verackTimeout);
    });
    p.send('version', m.raw());
  });
  p.on('end', function(d) {
    console.log('end');
  });
  p.on('error', function(d) {
    console.log('error', d.error);
    if (hosts.length > 0) tryLaunch(hosts);
  });
  p.on('close', function(d) {
    console.log('close', d);
    if (shutdown === false) {
      console.log('Connection closed, trying next...');
      setImmediate(function() {
        clearTimeout(connectTimeout);
        clearTimeout(verackTimeout);
        findPeer(pool);
      });
    }
  });

  p.on('message', function(d) {
    console.log('message', d.command, d.data.toString('hex'));
  });
  
  p.connect();
}

process.once('SIGINT', function() {
  shutdown = true;
  console.log('Got SIGINT; closing...');
  var watchdog = setTimeout(function() {
    console.log('Peer didn\'t close gracefully; force-closing');
    p.destroy();
  }, 10000);
  watchdog.unref();
  p.once('close', function() {
    clearTimeout(watchdog);
  });
  p.disconnect();
  process.once('SIGINT', function() {
    console.log('Hard-kill');
    process.exit(0);
  });
});
