var net = require('net');
var tls = require('tls');
var settings = require('./settings')
var events = require('events');
var util = require('util');
var crypto = require('crypto')

var Host = function Host(host, port) {
  var _host = false, // Private variables
      _port = false,
      _socket = false,
      _version = false;
      
  Object.defineProperties(this, {
    'host': {
      get: function() { return _host; },
      enumerable: true
    },
    'port': {
      get: function() { return _port; },
      enumerable: true
    },
    'socket': {
      get: function() { return _socket; },
      enumerable: true
    },
    'version': {
      get: function() { return _version; },
      enumerable: true
    }
  });
  
  if (Array.isArray(host)) {
    host = new Buffer(host);
  }
  _port = +port || this.defaultPort;
  
  if (typeof host === 'undefined') {
    _host = 'localhost';
    _version = 4;
    return this;
  } else if (host instanceof net.Socket){
    _socket = host;
    _host = _socket.remoteAddress;
    _port = _socket.remotePort;
    _version = net.isIP(_host)
    return this;
  } else if (typeof host === 'number') {
    // an IPv4 address, expressed as a little-endian 4-byte (32-bit) number
    // style of "pnSeed" array in Bitcoin reference client
    var buf = new Buffer(4);
    buf.writeInt32LE(host, 0);
    _host = Array.prototype.join.apply(buf, ['.']);
    _version = 4;
    return this;
  } else if (typeof host === 'string') {
    _host = host;
    _version = net.isIP(host);
    
    if (_version == 0) {
      // DNS host name string
      if (_host.indexOf(':') !== -1) {
        var pieces = _host.split(':');
        _host = pieces[0];
        _port = pieces[1]; // Given "example.com:8080" as host, and "1234" as port, the "8080" takes priority
        _version = net.isIP(_host);
        if (_version == 0) {
          // TODO: Resolve to IP, to ensure unique-ness
        }
      }
    }
    return this;
  } else if (Buffer.isBuffer(host)) {
    if (host.length == 4) {
      // IPv4 stored as bytes
      _host = Array.prototype.join.apply(host, ['.']);
      _version = 4;
      return this;
    } else if (host.slice(0, 12).toString('hex') != Host.IPV6_IPV4_PADDING.toString('hex')) {
      // IPv6
      _host = host.toString('hex').match(/(.{1,4})/g).join(':').replace(/\:(0{2,4})/g, ':0').replace(/^(0{2,4})/g, ':0');
      _version = 6;
      return this;
    } else {
      // IPv4 with padding in front
      _host = Array.prototype.join.apply(host.slice(12), ['.']);
      _version = 4;
      return this;
    }
  } else {
    throw new Error('Cound not instantiate peer; invalid parameter type: '+ typeof host);
  }
};
Host.prototype.IPV6_IPV4_PADDING = new Buffer([0,0,0,0,0,0,0,0,0,0,255,255]);
Host.prototype.defaultPort = 8333;

var Peer = exports.Peer = function Peer(host, port, magic) {
  events.EventEmitter.call(this);
  this.lastSeen = false;
  if (!(host instanceof Host)) {
    host = new Host(host, port);
  }
  //Keep host-values undisturbed:
  Object.defineProperty(this, 'host', {
    enumerable: true,
    configurable: false,
    writable:false,
    value: host
  });
  if (typeof magic !== 'undefined') this.magicBytes = magic;
  var myState = 'new';
  Object.defineProperty(this, 'state', {
    enumerable: true,
    get: function() {
      return myState;
    },
    //Allows us to emit a state-change event.
    set: function(newValue) {
      //Save state for next event:
      var oldState = myState;
      this.emit('stateChange', {new: newValue, old: oldState});
      myState = newValue;
    }
  });
  
  return this;
};
//Allows us to emit events as this.emit inside Peer
util.inherits(Peer, events.EventEmitter);

Peer.prototype.MAX_RECEIVE_BUFFER = 1024*1024*10;
//signal start of message. Chosen to be highly unlikely within normal data.
Peer.prototype.magicBytes = 0xD9B4BEF9;

Peer.prototype.connect = function connect(clTxtStream) {
  this.state = 'connecting';
  this.inbound = new Buffer(this.MAX_RECEIVE_BUFFER);
  this.inboundCursor = 0;

  //Problem: x isinstanceof tls.cleartextStream doesn't work.
  //Workaround: compare proto instead.
  var target_proto = new tls.createSecurePair().cleartext.__proto__

  //Check weather we have connection ...
  if (clTxtStream instanceof net.Socket){
    // ... in form of a socket ...
    var options = settings.TLS_connection_options;
    options.socket = clTxtStream
    options.host = clTxtStream.remoteAddress
    options.port = clTxtStream.remotePort
    clTxtStream = tls.connect(options, this.handleConnect.bind(this));
  } else if (typeof clTxtStream === 'undefined' || !(clTxtStream.__proto__ === target_proto)) {
    // ... and create one if we don't ...
    var options = settings.TLS_connection_options;
    options.host = this.host.host;
    options.port = this.host.port;
    options.socket = this.host.socket;
    //(We need the options-object for tls.connect. Read the doc!)
    clTxtStream = tls.connect(options, this.handleConnect.bind(this));
    this.state='connected'
  } else {
    // ... and just use the supplied connection
    // Binding to an already-connected socket;
    //will not fire a 'connect' event,
    //but will still fire a 'stateChange' event
    this.state = 'connected';
  }
  //BEWARE! "socket" is now actually a Stream!
  //Changing destroys backwards-compatability.
  Object.defineProperty(this, 'socket', {
    enumerable: false,
    configurable: false,
    writable:false,
    value: clTxtStream
  });
  //Binding events to our own event handler
  // (which will emit them as OUR events!)
  // handleConnect was bound during tls.connect()
  this.socket.on('error', this.handleError.bind(this));
  this.socket.on('data', this.handleData.bind(this));
  this.socket.on('end', this.handleEnd.bind(this));
  this.socket.on('close', this.handleClose.bind(this));
  
  return this.socket;
};
//-----------------------

//Some helper functions.
Peer.prototype.disconnect = function disconnect() {
  this.state = 'disconnecting';
  // Inform the other end we're going away
  this.socket.end();
};

Peer.prototype.destroy = function destroy() {
  this.socket.destroy();
};

Peer.prototype.getUUID = function getUUID() {
  return this.host.host+'~'+this.host.port;
}
//-----------------------

//Our event-handlers (and re-emitters):
Peer.prototype.handleConnect = function handleConnect() {
  this.state = 'connected';
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

Peer.prototype.handleClose = function handleClose(had_error) {
  this.state = 'closed';
  this.emit('close', {
    peer: this,
    had_error: had_error
  });
};
//-----------------------

//We need to calculate the Checksum sometimes.
//Best we expose this function to everyone:
Peer.prototype.messageChecksum = function(msg) {
  var sha256 = crypto.createHash('sha256')
  var shafin = crypto.createHash('sha256')
  sha256.update(msg)
  shafin.update(sha256.digest('hex'))
  return new Buffer(shafin.digest('hex')).slice(0,4);
};
//-----------------------

//The core of the matter. Sending and recieving data:
Peer.prototype.send = function send(command, data, callback) {
  //Package data. Even no data needs correct type!
  if (typeof data == 'undefined') {
    data = new Buffer(0);
  } else if (Array.isArray(data)) {
    data = new Buffer(data);
  }
  //Create extra space:
  var out = new Buffer(data.length + 24);
  //... and fill it:
  out.writeUInt32LE(this.magicBytes, 0); // magic (=> 4 bytes long)
  
  for (var i = 0; i < 12; i++) {
    var num = (i >= command.length)? 0 : command.charCodeAt(i);
    out.writeUInt8(num, 4+i); // command (=> max. 12 bytes long)
  }
  
  out.writeUInt32LE(data.length, 16); // length (=> 4 bytes long)
  
  var checksum = this.messageChecksum(data);
  checksum.copy(out, 20); // checksum (=> 4bytes long)

  //Write data into remaining, empty buffer:
  data.copy(out, 24);

  this.socket.write(out, null, callback);
};

Peer.prototype.handleData = function handleData(data) {
  //(we can trust data to be a Buffer.)
  this.lastSeen = new Date();
  
  // Add data to incoming buffer
  if (data.length + this.inboundCursor > this.inbound.length) {
    this.emit('error', 'Peer exceeded max receiving buffer');
    this.inboundCursor = this.inbound.length+1;
    return;
  }
  data.copy(this.inbound, this.inboundCursor);
  this.inboundCursor += data.length;
  
  // Can't process something less than 20 bytes in size.
  // Prevents unnecessary checks, ifs, emits ...
  if (this.inboundCursor < 20) return;
  
  // Split on magic bytes into message(s)
  var i = 0, endPoint = 0;
  //searching for messages
  while (i < this.inboundCursor) {
    //Look for message-start marked by magicBytes:
    if (this.inbound.readUInt32LE(i) == this.magicBytes) {
      var msgStart = i;
      //16 bytes behind start, we save message length:
      if (this.inboundCursor > msgStart + 16) {
        var msgLen = this.inbound.readUInt32LE(msgStart + 16);

        if (this.inboundCursor >= msgStart + 24 + msgLen) { //The head is 24 bytes long!
          // Complete message; parse it
          this.handleMessage(this.inbound.slice(msgStart, msgStart + 24 + msgLen));
          endPoint = msgStart + 24 + msgLen;
        }
        i += msgLen+24; // Skip to next message
      } else {
        i = this.inboundCursor; // Skip to end
      }
    } else {
      i++;
    }
  }
  
  // Done processing all found messages
  if (endPoint > 0) {
    //messaged parsed up to endPoint. Cursor points to this.inboundCursor, so we save it for next iteration:
    this.inbound.copy(this.inbound, 0, endPoint, this.inboundCursor); // Copy from later in the buffer to earlier in the buffer
    this.inboundCursor -= endPoint;
    //We now processed data until endPoint. Anything else remains in this.inbound. this.inboundCursor should point at the first new position.
  }
};

Peer.prototype.handleMessage = function handleMessage(msg) {
  var msgLen = msg.readUInt32LE(16);

  // Get command
  var cmd = [];
  for (var j=0; j<12; j++) {
    var s = msg[4+j];
    if (s > 0) {
      cmd.push(String.fromCharCode(s));
    }
  }
  cmd = cmd.join('');
  
  var checksum = msg.readUInt32BE(20);
  if (msgLen > 0) {
    var payload = new Buffer(msgLen);
    msg.copy(payload, 0, 24);
    var checksumCalc = this.messageChecksum(payload);
    if (checksum != checksumCalc.readUInt32BE(0)) {
      console.log('Supplied checksum of '+checksum.toString('hex')+' does not match calculated checksum of '+checksumCalc.toString('hex'));
    }
  } else {
    var payload = new Buffer(0);
  }
  
  //Standard-Message-Event
  this.emit('message', {
    peer: this,
    command: cmd,
    data: payload
  });
  //Shortcut-Event
  this.emit(cmd+'Message', {
    peer: this,
    data: payload
  });
};