# deno-redis

[![Build Status](https://github.com/keroxp/deno-redis/workflows/CI/badge.svg)](https://github.com/keroxp/deno-redis/actions)
![https://img.shields.io/github/tag/keroxp/deno-redis.svg](https://img.shields.io/github/tag/keroxp/deno-redis.svg)
[![license](https://img.shields.io/github/license/keroxp/deno-redis.svg)](https://github.com/keroxp/deno-redis)

An experimental implementation of redis client for deno

## Usage

needs `--allow-net` privilege

**Stateless Commands**

```ts
import { connect } from "https://denopkg.com/keroxp/deno-redis/mod.ts";
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

## Advanced Usage

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

- See https://github.com/keroxp/deno-redis/issues/78
