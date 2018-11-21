import { expect } from 'chai';
import { spy } from 'sinon';
import 'mocha';

import * as net from 'net';
import { Peer } from '../../src';

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
            localPeer = new Peer({ host: address, port }, 0x01020304);
            localPeer.connect();
        });
    });
    describe('events', () => {
        const magic = 0x01020304;
        let server: net.Server;
        let localPeer: Peer;
        let serverPeer: Peer;
        let message: Buffer;

        const makeMessage = () => {
            const message = Buffer.alloc(80, 0);
            message.writeUInt32LE(magic, 0);
            message.writeUInt32LE(magic, 64);
            return message;
        }

        after(() => {
            process.exit(0);
        });

        beforeEach((done) => {
            message = makeMessage();
            serverPeer = null;
            localPeer = null;
            server = net.createServer((socket: net.Socket) => {
                serverPeer = new Peer({ host: socket.remoteAddress, port: socket.remotePort }, magic);
                serverPeer.connect(socket);
            }).listen(() => {
                const { address, port } = <net.AddressInfo>server.address();
                localPeer = new Peer({ host: address, port }, magic);
                localPeer.connect();
                done();
            });
        });

        afterEach(() => {
            message = null;
            if (serverPeer) serverPeer.destroy();
            server.close();
            if (localPeer) localPeer.destroy();
        });

        describe('onMessage', () => {
            it('should handle new income buffers via emitting \'message\' event', (done) => {
                let timer: NodeJS.Timeout;
                localPeer.on('message', function (d) {
                    done();
                });

                serverPeer.send(message);
            });
            it('should emit \'message\' event with correct data object', (done) => {
                let timer: NodeJS.Timeout;
                localPeer.on('message', function (d) {
                    expect(d.peer, 'peer property should be instance of Peer class').to.be.an.instanceof(Peer);
                    expect(d.data, 'data property equal sent data').exist;
                    done();
                });

                serverPeer.send(message);
            });
        });
    });
});