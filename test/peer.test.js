var Peer = require('../lib/Peer').Peer;
var assert = require("assert");
var settings = require('./test-settings')
var tls = require('tls');
var net = require('net');

var suboptions = settings.TLS_server_options;

describe('P2P Peer', function() {
  it('should properly connect to indicated host', function(done) {
    var localPeer = false;
    var server = tls.createServer(suboptions, function(clTxtStream) {
      server.close();
      clTxtStream.destroy()
      localPeer.destroy()
      done();
    });
    server.listen(function() {
      localPeer = new Peer(server.address().address, server.address().port);
      localPeer.connect();
    });
  });
  it('should accept a socket as Peer', function(done){
    var localPeer = false;
    var server = tls.createServer(suboptions, function(clTxtStream) {
      server.close();
      clTxtStream.destroy()
      localPeer.destroy()
      done();
    });
    server.listen(function(){
      var sock = net.connect({port:server.address().port})
      localPeer = new Peer(sock)
      localPeer.connect()
    });
  });
  it('should accept a socket as a connection', function(done){
    var localPeer = false;
    var server = tls.createServer(suboptions, function(clTxtStream) {
      server.close();
      clTxtStream.destroy()
      localPeer.destroy()
      done();
    });
    server.listen(function() {
      //INCORRECT PORT
      localPeer = new Peer(server.address().address, server.address().port+5);
      var sock = net.connect({port:server.address().port});
      //CONNECT TO SOCKET WITH CORRECT PORT!
      localPeer.connect(sock);
      localPeer.on('connection', function(){
        done()
      })
    });
  })
  describe('Messaging', function() {
    //Magic set for test only:
    var magic = 0x01020304;
    var server = false;
    var localPeer = false;
    var serverPeer = false;
    
    beforeEach(function(done) {
      serverPeer = false;
      server = tls.createServer(suboptions, function(clTxtStream) {
        serverPeer = new Peer(clTxtStream.remoteAddress, clTxtStream.remotePort, magic);
        serverPeer.connect(clTxtStream);
      });
      localPeer = false;
      server.listen(function() {
        localPeer = new Peer(server.address().address, server.address().port, magic);
        done();
      });
    });
    
    afterEach(function() {
      if (serverPeer !== false) serverPeer.destroy();
      server.close();
      if (localPeer !== false) localPeer.destroy();
    });
  
    it('should properly parse data stream into message events', function(done) {
      var timer = false;
      localPeer.on('message', function(d) {
        assert.equal(d.command, 'hello');
        assert. equal(d.data.toString('utf8'), 'world');
        clearInterval(timer);
        done();
      });
      localPeer.connect();
      timer = setInterval(function() {
        if (serverPeer !== false) {
          serverPeer.send('hello', new Buffer('world', 'utf8'));
        }
      }, 100);
    });
    it('should properly parse data stream into command message events', function(done) {
      var timer = false;
      localPeer.once('helloMessage', function(d) {
        assert.equal(d.data.toString('utf8'), 'world');
        clearInterval(timer);
        done();
      });
      localPeer.connect();
      timer = setInterval(function() {
        if (serverPeer !== false) {
          serverPeer.send('hello', new Buffer('world', 'utf8'));
        }
      }, 100);
    });
    it('should error out if internal buffer is overflown', function(done) {
        var timer = false;
        localPeer.once('helloMessage', function(d) {
          assert.equal(d.data.toString('utf8'), 'world');
          clearInterval(timer);
          done();
        });
        localPeer.MAX_RECEIVE_BUFFER = 10;
        localPeer.on('error', function(err) {
          if (err == 'Peer exceeded max receiving buffer') {
            clearInterval(timer);
            done();
          }
        });
        localPeer.connect();
        timer = setInterval(function() {
          if (serverPeer !== false) {
            serverPeer.send('hello', new Buffer('world', 'utf8'));
          }
        }, 100);
    });
    it('should not error out if multiple messages fill up the buffer', function(done) {
        var timer = false;
        localPeer.once('helloMessage', function(d) {
          assert.equal(d.data.toString('utf8'), 'world');
          clearInterval(timer);
          done();
        });
        localPeer.MAX_RECEIVE_BUFFER = 30;
        var count = 0;
        localPeer.on('helloMessage', function(d) {
          count++;
          if (count >= 5) {
            clearInterval(timer);
            done();
          }
        });
        localPeer.connect();
        timer = setInterval(function() {
          if (serverPeer !== false) {
            serverPeer.send('hello', new Buffer('world', 'utf8'));
          }
        }, 100);
    });
  });
});
