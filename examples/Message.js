var sha256 = require('sha256');

var Message = exports.Message = function Message(magic) {
  this.buffer = new DataView(new ArrayBuffer(10000));
  this.cursor = 0;
  this.magicBytes = magic;
};
Message.prototype.checksum = function checksum() {
  var bytes = sha256.x2(Array.prototype.slice.apply(new Uint8Array(this.buffer.buffer.slice(0,this.cursor))), {asBytes:true});
  var dv = new DataView(new ArrayBuffer(4));
  for (var i = 0; i < 4; i++) {
  	dv.setUint8(i, bytes[i]);
  }
  return dv;
};
Message.prototype.build = function build(command) {
  var out = new DataView(new ArrayBuffer(this.cursor + 24));
  out.setUint32(0, this.magicBytes, true); // magic
  
  for (var i = 0; i < 12; i++) {
    var num = (i > command.length)? 0 : command.charCodeAt(i);
    out.setUint8(4+i, num); // command
  }
  
  out.setUint32(16, this.cursor, true); // length
  out.setUint32(20, this.checksum().getUint32(0)); // checksum
  for (var i = 0; i < this.cursor; i++) {
    out.setUint8(24+i, this.buffer.getUint8(i)); // payload
  }
  return out;
};
Message.prototype.pad = function pad(num) {
  var i8 = new Uint8Array(num);
  for (var i = 0; i < num; i++) {
    i8[i] = 0;
  }
  return this.put(new DataView(i8.buffer));
};
Message.prototype.put = function put(data) {
  if (typeof data == 'number') {
    this.buffer.setUint8(this.cursor, data);
    this.cursor += 1;
    return this;
  }
  
  for (var i = 0; i < data.byteLength; i++) {
    this.buffer.setUint8(this.cursor+i, data.getUint8(i));
  }
  this.cursor += data.byteLength;
  return this;
};
Message.prototype.putInt16 = function putInt16(num) {
  var dv = new DataView(new ArrayBuffer(2));
  dv.setUint16(0, num, true);
  return this.put(dv);
};
Message.prototype.putInt32 = function putInt32(num) {
  var dv = new DataView(new ArrayBuffer(4));
  dv.setUint32(0, num, true);
  return this.put(dv);
};
Message.prototype.putInt64 = function putInt64(num) {
  var dv = new DataView(new ArrayBuffer(8));
  dv.setUint32(0, num, true);
  dv.setUint32(4, 0, true);
  return this.put(dv);
};
Message.prototype.putString = function putString(str) {
  var i8 = new Uint8Array(str.length);
  for(var i = 0; i < str.length; i++) {
    i8[i] = str.charCodeAt(i);
  }
  return this.put(new DataView(i8.buffer));
};
Message.prototype.putVarInt = function putVarInt(num) {
  if (num < 0xfd) {
    return this.put(num);
  } else if (num <= 0xffff) {
    return this.put(0xfd).putInt16(num);
  } else if (num <= 0xffffffff) {
    return this.put(0xfe).putInt32(num);
  } else {
    return this.put(0xff).putInt64(num);
  }
};
Message.prototype.putVarString = function putVarString(str) {
  return this.putVarInt(str.length).putString(str);
}