var net = require('net');
var events = require('events');
var util = require('util');
var sha256 = require('sha256');

var Host = function Host(host, port) {
  if (Array.isArray(host)) {
    host = new Buffer(host);
  }
  this.port = +port || this.defaultPort;
  
  if (typeof host === 'undefined') {
    this.host = 'localhost';
    this.version = 4;
    return this;
  } else if (typeof host === 'number') {
    // an IPv4 address, expressed as a little-endian 4-byte (32-bit) number
    // style of "pnSeed" array in Bitcoin reference client
    var buf = new Buffer(4);
    buf.writeInt32LE(host, 0);
    this.host = Array.prototype.join.apply(buf, ['.']);
    this.version = 4;
    return this;
  } else if (typeof host === 'string') {
    // DNS host name string
    if (host.indexOf(':') !== -1) {
      var pieces = host.split(':');
      this.host = pieces[0];
      this.port = pieces[1]; // Given "example.com:8080" as host, and "1234" as port, the "8080" takes priority
    } else {
      this.host = host;
    }
    this.version = (!net.isIP(host) || net.isIPv4(host))? 4 : 6;
    return this;
  } else if (Buffer.isBuffer(host)) {
    if (host.length == 4) {
      // IPv4 stored as bytes
      this.host = Array.prototype.join.apply(host, ['.']);
      this.version = 4;
      return this;
    } else if (host.slice(0, 12).toString('hex') != Host.IPV6_IPV4_PADDING.toString('hex')) {
      // IPv6
      this.host = host.toString('hex').match(/(.{1,4})/g).join(':').replace(/\:(0{2,4})/g, ':0').replace(/^(0{2,4})/g, ':0');
      this.version = 6;
      return this;
    } else {
      // IPv4 with padding in front
      this.host = Array.prototype.join.apply(host.slice(12), ['.']);
      this.version = 4;
      return this;
    }
  } else {
    throw new Error('Cound not instantiate peer; invalid parameter type: '+ typeof host);
  }
};
Host.prototype.IPV6_IPV4_PADDING = new Buffer([0,0,0,0,0,0,0,0,0,0,255,255]);
Host.prototype.defaultPort = 8333;

var Peer = exports.Peer = function Peer(host, port) {
  events.EventEmitter.call(this);
  if (host instanceof Host) {
    this.host = host;
  } else {
    this.host = new Host(host, port);
  }
};
util.inherits(Peer, events.EventEmitter);

Peer.prototype.MAX_RECEIVE_BUFFER = 10000;
Peer.prototype.magicBytes = 0xD9B4BEF9;

Peer.prototype.connect = function connect(socket) {
  this.inbound = new DataView(new ArrayBuffer(this.MAX_RECEIVE_BUFFER));
  this.inboundCursor = 0;

  if (typeof socket !== 'undefined' && socket instanceof net.Socket) {
    // Bind to an already-opened socket connection
    this.socket = socket;
  } else {
    this.socket = net.createConnection(this.host.port, this.host.host, this.handleConnect.bind(this));
  }
  this.socket.on('error', this.handleError.bind(this));
  this.socket.on('data', this.handleData.bind(this));
  this.socket.on('end', this.handleEnd.bind(this));
  
  return this.socket;
};

Peer.prototype.disconnect = function disconnect() {
  this.socket.destroy();
};

Peer.prototype.handleConnect = function handleConnect() {
  this.emit('connect', {
    peer: this,
  });
};

Peer.prototype.handleEnd = function handleEnd() {
  this.emit('end', {
    peer: this,
  });
};

Peer.prototype.handleError = function handleError(data) {
  this.emit('error', {
    peer: this,
    error: data
  });
};

Peer.prototype.send = function send(data, callback) {
  this.socket.write(new Buffer(data), null, callback);
};

Peer.prototype.handleData = function handleData(data) {
  // Add data to incoming buffer
  if (data.length + this.inboundCursor > this.inbound.byteLength) {
    throw new Error('Peer exceeded max receiving buffer');
  }
  for (var i = 0; i < data.length; i++) {
    this.inbound.setUint8(this.inboundCursor + i, data[i]);
  }
  this.inboundCursor += data.length;
  
  if (this.inboundCursor < 20) return; // Can't process something less than 20 bytes in size
  
  var found = false;
  for (var i = 0; i < this.inboundCursor; i++) {
    if (this.inbound.getUint32(i, true) == this.magicBytes) {
      found = true;
      break;
    }
  }
  if (!found) return; // No magic bytes yet...
  
  var msgStart = i;
  
  // Get command
  var cmd = [];
  for (var i = 0; i < 12; i++) {
    var s = this.inbound.getUint8(msgStart+4+i)
    if (s > 0) {
      cmd.push(String.fromCharCode(s));
    }
  }
  cmd = cmd.join('');
  
  var payloadLength = this.inbound.getUint32(msgStart+16, true);
  var checksum = this.inbound.getUint32(msgStart+20, false);
  
  if (this.inboundCursor < msgStart+payloadLength+24) return; // Not the whole message yet
  
  if (payloadLength > 0) {
    var payload = new DataView(this.inbound.buffer.slice(msgStart+24, msgStart+24+payloadLength));
    var checksumCalc = sha256.x2(Array.prototype.slice.apply(new Uint8Array(payload.buffer)), {asBytes:true});
    var dv = new DataView(new ArrayBuffer(4));
    for (var i = 0; i < 4; i++) {
    	dv.setUint8(i, checksumCalc[i]);
    }
    if (checksum != dv.getUint32(0)) {
      console.log('Supplied checksum of '+checksum.toString(16)+' does not match calculated checksum of '+dv.getUint32(0).toString(16));
    }
  } else {
    var payload = false;
  }
  
  this.emit('message', {
    peer: this,
    command: cmd,
    data: payload
  });
  this.inboundCursor = 0; // Reset inbound buffer
};