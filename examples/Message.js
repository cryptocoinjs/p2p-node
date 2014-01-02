var sha256 = require('sha256');

var Message = exports.Message = function Message(magic) {
  this.buffer = new Buffer(10000);
  this.cursor = 0;
  this.magicBytes = magic;
};
Message.prototype.checksum = function checksum() {
  return new Buffer(sha256.x2(this.buffer.slice(0, this.cursor), { asBytes:true }));
};
Message.prototype.build = function build(command) {
  var out = new Buffer(this.cursor + 24);
  out.writeUInt32LE(this.magicBytes, 0); // magic
  
  for (var i = 0; i < 12; i++) {
    var num = (i >= command.length)? 0 : command.charCodeAt(i);
    out.writeUInt8(num, 4+i); // command
  }
  
  out.writeUInt32LE(this.cursor, 16); // length
  this.checksum().copy(out, 20); // checksum
  this.buffer.copy(out, 24, 0, this.cursor); // payload
  return out;
};
Message.prototype.pad = function pad(num) {
  var data = new Buffer(num);
  data.fill(0);
  return this.put(data);
};
Message.prototype.put = function put(data) {
  if (typeof data == 'number' && data <= 255) {
    this.buffer[this.cursor] = data;
    this.cursor += 1;
    return this;
  }
  
  data.copy(this.buffer, this.cursor);
  this.cursor += data.length;
  return this;
};
Message.prototype.putInt16 = function putInt16(num) {
  var data = new Buffer(2);
  data.writeUInt16LE(num, 0);
  return this.put(data);
};
Message.prototype.putInt32 = function putInt32(num) {
  var data = new Buffer(4);
  data.writeUInt32LE(num, 0);
  return this.put(data);
};
Message.prototype.putInt64 = function putInt64(num) {
  var data = new Buffer(8);
  data.fill(0);
  data.writeUInt32LE(num, 0);
  return this.put(data);
};
Message.prototype.putString = function putString(str) {
  var data = new Buffer(str.length);
  for(var i = 0; i < str.length; i++) {
    data[i] = str.charCodeAt(i);
  }
  return this.put(data);
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