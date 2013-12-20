var Peer = require('./lib/Peer');

var p = new Peer.Peer('dnsseed.bluematt.me');

p.on('connect', function(d) {
  console.log('connect');
  // Send VERSION
  var m = new Peer.Message(p.magicBytes, true);
  m.putInt32(70000); // version
  m.putInt64(1); // services
  m.putInt64(Math.round(new Date().getTime()/1000)); // timestamp
  m.pad(26); // addr_me
  m.pad(26); // addr_you
  m.putInt64(42); // nonce
  m.putVarString('Node.js lite peer');
  m.putInt32(10); // start_height
  var raw = m.build('version');
  console.log(raw);
});
p.on('end', function(d) {
  console.log('end');
});
p.on('error', function(d) {
  console.log('error', d);
});

process.on('SIGINT', function() {
  console.log('Got SIGINT; closing...');
  p.disconnect();
  process.exit(0);
});

p.connect();
