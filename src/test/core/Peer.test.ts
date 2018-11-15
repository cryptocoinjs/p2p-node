import * as net from 'net';
import { Peer } from 'core';
import { expect } from 'chai';
import 'mocha';

describe('P2P:core Peer', () => {
    it('should properly connect to indicated host', (done) => {
        let localPeer: Peer;
        const server = net.createServer(() => {
            server.close();
            localPeer.destroy();
            done();
        });
        server.listen(() => {
            const { address, port } = server.address() as net.AddressInfo;
            localPeer = new Peer({ host: address, port});
            localPeer.connect();
        });
    });
    describe('Messaging', () => {
        const magic = 0x01020304;
        let server: net.Server;
        let localPeer: Peer;
        let serverPeer: Peer;

        after(() => {
            process.exit(0);
        });

        beforeEach((done) => {
            serverPeer = null;
            localPeer = null;
            server = net.createServer((socket: net.Socket) => {
                serverPeer = new Peer({ host: socket.remoteAddress, port: socket.remotePort }, magic);
                serverPeer.connect(socket);
            }).listen(() => {
                const { address, port } = server.address() as net.AddressInfo;
                localPeer = new Peer({ host: address, port }, magic);
                localPeer.connect();
                done();
            });
        });

        afterEach(() => {
            if (serverPeer) serverPeer.destroy();
            server.close();
            if (localPeer) localPeer.destroy();
        });

        it('should properly parse data stream into message events', (done) => {
            let timer: NodeJS.Timeout;
            localPeer.on('message', function (d) {
                expect(d.command).to.equal('hello');
                expect(d.data.toString('utf8')).to.equal('world');
                clearInterval(timer);
                done();
            });

            timer = setInterval(() => {
                if (serverPeer) {
                    serverPeer.send('hello', Buffer.from('world'));
                }
            }, 100);
        });
        it('should properly parse data stream into command message events', (done) => {
            let timer: NodeJS.Timeout;
            localPeer.once('helloMessage', function (d) {
                expect(d.data.toString('utf8')).to.equal('world');
                clearInterval(timer);
                done();
            });
            localPeer.connect();
            timer = setInterval(() => {
                if (serverPeer) {
                    serverPeer.send('hello', Buffer.from('world', 'utf8'));
                }
            }, 100);
        });
        it('should error out if internal buffer is overflown', (done) => {
            let timer: NodeJS.Timeout;
            localPeer.once('helloMessage', function (d) {
                expect(d.data.toString('utf8')).to.equal('world');
                clearInterval(timer);
                done();
            });
            localPeer.MAX_RECEIVE_BUFFER = 10;
            localPeer.on('error', function (err) {
                if (err == 'Peer exceeded max receiving buffer') {
                    clearInterval(timer);
                    done();
                }
            });
            localPeer.connect();
            timer = setInterval(() => {
                if (serverPeer) {
                    serverPeer.send('hello', Buffer.from('world', 'utf8'));
                }
            }, 100);
        });
        it('should not error out if multiple messages fill up the buffer', (done) => {
            let timer: NodeJS.Timeout;
            localPeer.once('helloMessage', (d) => {
                expect(d.data.toString('utf8')).to.equal('world');
                clearInterval(timer);
                done();
            });
            localPeer.MAX_RECEIVE_BUFFER = 30;
            let count = 0;
            localPeer.on('helloMessage', () => {
                count++;
                if (count >= 5) {
                    clearInterval(timer);
                    done();
                }
            });
            localPeer.connect();
            timer = setInterval(() => {
                if (serverPeer) {
                    serverPeer.send('hello', Buffer.from('world', 'utf8'));
                }
            }, 100);
        });
    });
});