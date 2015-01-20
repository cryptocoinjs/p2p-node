# P2P Node
Low-level library to handle peer-to-peer traffic on Cryptcurrency networks. A raw `socket` object in Node emits `data` events whenever the stream is updated. This library sits on top of a raw tls connection, and instead of emitting `data` events every time the stream updates, it waits and emits `message` events whenever a complete message has arrived. The tls connection is then wrapped as a simple socket connection.

It uses the [Bitcoin protocol structure](https://en.bitcoin.it/wiki/Protocol_specification#Message_structure) to parse incoming messages; any stream that's encoded as follows can be parsed:

* **4 bytes: Uint32:** Magic Bytes: Flag the beginning of a message
* **12 bytes: Char:** ASCII string identifying the message type, null-padded to 12 characters long
* **4 bytes: Uint32:** Payload length
* **4 bytes: Uint32:** Checksum: First four bytes of `sha256(sha256(payload))`
* **variable bytes:** Payload data

The default Magic Bytes and default Port to connect to are set to the Bitcoin protocol. 

## Usage

```js
var Peer = require('Peer').Peer;

var p = new Peer('remote.node.com');
p.on('connect', function(d) {
  console.log("I'm connected!");
});
p.on('message', function(d) {
  console.log("I got message "+d.command);
});
```

`Peer` is an [EventEmitter](http://nodejs.org/api/events.html) with the following events:

## Events

### `connect`
When the socket connects/the connection is established

Data object passed to listeners:

```
{
  peer: Peer
}
```

### `error`
If the socket/connection errors out

Data object passed to listeners:

```
{
  peer: Peer,
  error: Error object from Stream
}
```

### `end`
When the socket disconnects

Data object passed to listeners:

```
{
  peer: Peer
}
```

### `message`
When a complete message has arrived

Data object passed to listeners:

```
{
  peer: Peer,
  command: String,
  data: Raw payload as binary data
}
```

### `commandMessage`
An alternate version of the `peerMessage` event; in these events, the command of the message is used as the event name (i.e. command `'foo'` would cause a `fooMessage` event).

```
{
	peer: Peer,
	data: Raw payload as binary data
}
```

### `stateChange`
When the peer changes state, this event is emitted, except for the "new" state, which is set upon creation.

```
{
  new: String (new state name),
  old: String (old state name)
}
```
