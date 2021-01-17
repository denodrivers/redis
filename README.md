# deno-redis

[![Build Status](https://github.com/denodrivers/redis/workflows/CI/badge.svg)](https://github.com/denodrivers/redis/actions)
![https://img.shields.io/github/tag/denodrivers/redis.svg](https://img.shields.io/github/tag/denodrivers/redis.svg)
[![license](https://img.shields.io/github/license/denodrivers/redis.svg)](https://github.com/denodrivers/redis)
[![deno doc](https://doc.deno.land/badge.svg)](https://doc.deno.land/https/deno.land/x/redis/mod.ts)

An experimental implementation of redis client for deno

## Usage

needs `--allow-net` privilege

**Stateless Commands**

```ts
import { connect } from "https://deno.land/x/redis/mod.ts";
const redis = await connect({
  hostname: "127.0.0.1",
  port: 6379
});
const ok = await redis.set("hoge", "fuga");
const fuga = await redis.get("hoge");
```

**PubSub**

```ts
const sub = await redis.subscribe("channel");
(async function() {
  for await (const { channel, message } of sub.receive()) {
    // on message
  }
})();
```

**Streams**

```ts
await redis.xadd(
  "somestream",
  "*", // let redis assign message ID
  { yes: "please", no: "thankyou" },
  { elements: 10 },
);

const [stream] = await client.xread(
  [{ key: "somestream", xid: 0 }], // read from beginning
  { block: 5000 },
);

const msgFV = stream.messages[0].field_values;
const plz = msgFV["yes"];
const thx = msgFV["no"];
```

**Cluster**

```ts
await redis.meet("127.0.0.1", 6380);
await redis.nodes();
// ... 127.0.0.1:6379@16379 myself,master - 0 1593978765000 0 connected
// ... 127.0.0.1:6380@16380 master - 0 1593978766503 1 connected
```

## Advanced Usage

### Retriable connection

By default, a client's connection will throw an error if the server dies or the network becomes unavailable.
A connection can be made "retriable" by setting the value `maxRetryCount` when connecting a new client.

```ts
const redis = await connect({ ...options, maxRetryCount: 10 });

// The client will try to connect to the server 10 times if the server dies or the network becomes unavailable.
```

The property is set automatically to `10` when creating a subscriber client.
After a reconnection succeeds, the client will subscribe again to all the channels and patterns.

```ts
const redis = await connect(options);
const subscriberClient = await redis.subscribe("channel");

// The client's connection will now be forced to try to connect to the server 10 times if the server dies or the network
//   becomes unavailable.
```

### Execute raw commands

`redis.executor` is raw level [redis protocol](https://redis.io/topics/protocol) executor.
You can send raw redis commands and receive replies.

```ts
await redis.executor.exec("SET", "redis", "nice"); // => ["status", "OK"]
await redis.executor.exec("GET", "redis"); // => ["bulk", "nice"]
```

### Pipelining

https://redis.io/topics/pipelining

```ts
const redis = await connect({
  hostname: "127.0.0.1",
  port: 6379
});
const pl = redis.pipeline();
pl.ping();
pl.ping();
pl.set("set1", "value1");
pl.set("set2", "value2");
pl.mget("set1", "set2");
pl.del("set1");
pl.del("set2");
const replies = await pl.flush();
```

### TxPipeline (pipeline with MULTI/EXEC)

We recommend to use `tx()` instead of `multi()/exec()` for transactional operation.  
`MULTI/EXEC` are potentially stateful operation so that operation's atomicity is guaranteed but redis's state may change between MULTI and EXEC.

`WATCH` is designed for these problems. You can ignore it by using TxPipeline because pipelined MULTI/EXEC commands are strictly executed in order at the time and no changes will happen during execution.

See detail https://redis.io/topics/transactions

```ts
const tx = redis.tx();
tx.set("a", "aa");
tx.set("b", "bb");
tx.del("c");
await tx.flush();
// MULTI
// SET a aa
// SET b bb
// DEL c
// EXEC
```

## Roadmap for v1

- See https://github.com/denodrivers/redis/issues/78
