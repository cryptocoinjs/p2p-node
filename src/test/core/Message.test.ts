import * as net from 'net';
import { Message } from 'core';
import { expect } from 'chai';
import 'mocha';

describe('P2P:core Message', () => {
    describe('raw', () => {
        it('should make and return new buffer with current compiled data', () => {
            const message = new Message();
            const data = Buffer.alloc(0);
            expect(message.raw().toString('hex')).to.be.equal(data.toString('hex'));
        });
    });
    describe('pad', () => {
        it('should make zero-padding', () => {
            const padSize = 10;
            const data = Buffer.alloc(padSize);
            const message = new Message();
            message.pad(10);
            expect(message.raw().toString('hex')).to.be.equal(data.toString('hex'));
        });
    });
    xdescribe('putVarInt', () => {
        let message: Message;
        beforeEach(() => {
            message = new Message();
        });
        afterEach(() => {
            message = null;
        });
        it('putInt16 should add to message number with 16 byte length', () => {

        });
        it('putInt32 should add to message number with 32 byte length', () => {

        });
        it('putInt64 should add to message number with 64 byte length', () => {

        });
    });
    describe('putVarString', () => {
        let message: Message;
        beforeEach(() => {
            message = new Message();
        });
        afterEach(() => {
            message = null;
        });
        it('should add to message string with variable length', () => {
            const string = 'Elit occaecat amet eiusmod minim ea laboris.';
            const data = Buffer.alloc(string.length);
            for (let i = 0; i < string.length; i++) {
                data[i] = string.charCodeAt(i);
            }
            const buffer = Buffer.alloc(10000);
            buffer[0] = string.length;
            data.copy(buffer, 1);
            message.putVarString(string);
            expect(message.raw().toString('hex')).to.be.equal(buffer.slice(0, data.length + 1).toString('hex'));
        });
    });
});