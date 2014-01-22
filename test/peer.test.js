var Peer = require('../lib/Peer').Peer;
var assert = require("assert");
var net = require('net');

describe('P2P Peer', function() {
  it('should properly connect to indicated host', function(done) {
    var localPeer = false;
    var server = net.createServer(function(socket) {
      server.close();
      localPeer.destroy();
      done();
    });
    server.listen(function() {
      localPeer = new Peer(server.address().address, server.address().port);
      localPeer.connect();
    });
  });
  it('should properly parse data stream into message events', function(done) {
    var magic = 0x01020304;
    var localPeer = false;
    var serverPeer = false;
    var server = net.createServer(function(socket) {
      serverPeer = new Peer(socket.remoteAddress, socket.remotePort, magic);
      serverPeer.connect(socket);
      serverPeer.send('hello', new Buffer('world', 'utf8'));
    });
    server.listen(function() {
      localPeer = new Peer(server.address().address, server.address().port, magic);
      localPeer.on('message', function(d) {
        assert.equal(d.command, 'hello');
        assert. equal(d.data.toString('utf8'), 'world');
        serverPeer.destroy();
        server.close();
        localPeer.destroy();
        done();
      });
      localPeer.connect();
    });
  });
  it('should properly parse data stream into command message events', function(done) {
    var magic = 0x01020304;
    var localPeer = false;
    var serverPeer = false;
    var server = net.createServer(function(socket) {
      serverPeer = new Peer(socket.remoteAddress, socket.remotePort, magic);
      serverPeer.connect(socket);
      serverPeer.send('hello', new Buffer('world', 'utf8'));
    });
    server.listen(function() {
      localPeer = new Peer(server.address().address, server.address().port, magic);
      localPeer.on('helloMessage', function(d) {
        assert.equal(d.data.toString('utf8'), 'world');
        serverPeer.destroy();
        server.close();
        localPeer.destroy();
        done();
      });
      localPeer.connect();
    });
  });
  it('should error out if internal buffer is overflown', function(done) {
    var magic = 0x01020304;
    var localPeer = false;
    var serverPeer = false;
    var server = net.createServer(function(socket) {
      serverPeer = new Peer(socket.remoteAddress, socket.remotePort, magic);
      serverPeer.connect(socket);
      serverPeer.send('hello', new Buffer('world', 'utf8'));
    });
    server.listen(function() {
      localPeer = new Peer(server.address().address, server.address().port, magic);
      localPeer.on('error', function(err) {
        if (err == 'Peer exceeded max receiving buffer') {
          serverPeer.destroy();
          server.close();
          localPeer.destroy();
          done();
        }
      });
      localPeer.MAX_RECEIVE_BUFFER = 10;
      localPeer.connect();
    });
  });
  it('should not error out if multiple messages fill up the buffer', function(done) {
    var magic = 0x01020304;
    var timer = false;
    var localPeer = false;
    var serverPeer = false;
    var server = net.createServer(function(socket) {
      serverPeer = new Peer(socket.remoteAddress, socket.remotePort, magic);
      serverPeer.connect(socket);
      timer = setInterval(function() {
        serverPeer.send('hello', new Buffer('world', 'utf8'));
      }, 50);
    });
    server.listen(function() {
      localPeer = new Peer(server.address().address, server.address().port, magic);
      var count = 0;
      localPeer.on('helloMessage', function(d) {
        count++;
        if (count >= 5) {
          clearInterval(timer);
          serverPeer.destroy();
          server.close();
          localPeer.destroy();
          done();
        }
      });
      localPeer.MAX_RECEIVE_BUFFER = 30;
      localPeer.connect();
    });
  });
});
