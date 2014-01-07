var Peer = require('../lib/Peer').Peer;
var Message = require('./Message').Message;

var p = new Peer(0x291f20b2, 8334, 0xFEB4BEF9);

p.on('connect', function(d) {
  console.log('connect');

  // Send VERSION message
  var m = new Message(p.magicBytes, true);
  m.putInt32(35000); // version
  m.putInt64(1); // services
  m.putInt64(Math.round(new Date().getTime()/1000)); // timestamp
  m.pad(26); // addr_me
  m.pad(26); // addr_you
  m.putInt64(0x1234); // nonce
  m.putVarString('Node.js lite peer');
  m.putInt32(10); // start_height
  
  //console.log(m.raw().toString('hex'));
  p.send('version', m.raw());
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
