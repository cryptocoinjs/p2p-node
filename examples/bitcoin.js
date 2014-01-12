var Peer = require('../lib/Peer').Peer;
var Message = require('./Message').Message;

var dns = require('dns');


var shutdown = false;
var p = false;
var findPeer = function findPeer(pool) {
  if (pool.length == 0) {
    console.log('No more potential peers...');
    return;
  }
  
  console.log('Finding new peer from pool of '+pool.length+' potential peers');
  p = new Peer(pool.shift());
  
  var connectTimeout = setTimeout(function() { // Give them a few seconds to respond, otherwise close the connection automatically
    console.log('Peer never connected; hanging up');
    p.destroy();
  }, 5*1000);
  connectTimeout.unref();
  var verackTimeout = false;

  p.on('connect', function(d) {
    console.log('connect');
    clearTimeout(connectTimeout);

    // Send VERSION message
    var m = new Message(p.magicBytes, true);
    m.putInt32(70000); // version
    m.putInt64(1); // services
    m.putInt64(Math.round(new Date().getTime()/1000)); // timestamp
    m.pad(26); // addr_me
    m.pad(26); // addr_you
    m.putInt64(0x1234); // nonce
    m.putVarString('Node.js lite peer');
    m.putInt32(10); // start_height
  
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
    console.log('error', d);
    d.peer.destroy();
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

  console.log('Attempting connection to '+p.getUUID());
  p.connect();
};

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

// Find a single IP address
dns.resolve4('dnsseed.bluematt.me', function(err, addrs) {
  if (err) {
    console.log(err);
    return;
  }
  findPeer(addrs);
});