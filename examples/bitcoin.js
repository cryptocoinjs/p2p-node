var Peer = require('../lib/Peer').Peer;
var Message = require('./Message').Message;

var p = new Peer('dnsseed.bitcoin.dashjr.org');

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
  //console.log(DataViewToHex(raw));
  p.send(DataViewToArray(raw));
});
p.on('end', function(d) {
  console.log('end');
});
p.on('error', function(d) {
  console.log('error', d);
});
p.on('message', function(d) {
  console.log('message', d.command, DataViewToHex(d.data));
});

process.on('SIGINT', function() {
  console.log('Got SIGINT; closing...');
  p.disconnect();
  process.exit(0);
});

p.connect();

function DataViewToArray(dv) {
  if (dv instanceof DataView === false) return false;
  return Array.prototype.slice.apply(new Uint8Array(dv.buffer));
}

function DataViewToHex(dv) {
  if (dv instanceof DataView === false) return false;
  return DataViewToArray(dv).map(function(x) { return ('000'+x.toString(16)).slice(-2); }).join('');
}

function DataViewToBinary(dv) {
  if (dv instanceof DataView === false) return false;
  return DataViewToArray(dv).map(function(x) { return String.fromCharCode(x); }).join('');
}