var Peer = require('../lib/Peer').Peer;
var Message = require('./Message').Message;

var p = new Peer('testnet-seed.bitcoin.petertodd.org', 18333, 0x0709110B);

p.on('connect', function(d) {
  console.log('connect');

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
  
  var raw = m.build('version');
  console.log(raw.toString('hex'));
  p.send(raw);
});
p.on('end', function(d) {
  console.log('end');
});
p.on('error', function(d) {
  console.log('error', d);
});
p.on('message', function(d) {
  console.log('message', d.command, d.data.toString('hex'));
});

process.on('SIGINT', function() {
  console.log('Got SIGINT; closing...');
  p.disconnect();
  process.exit(0);
});

p.connect();
