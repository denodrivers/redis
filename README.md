# deno-redis

[![CircleCI](https://circleci.com/gh/keroxp/deno-redis.svg?style=svg)](https://circleci.com/gh/keroxp/deno-redis)
![https://img.shields.io/github/tag/keroxp/deno-redis.svg](https://img.shields.io/github/tag/keroxp/deno-redis.svg)
[![license](https://img.shields.io/github/license/keroxp/deno-redis.svg)](https://github.com/keroxp/deno-redis)
[![tag](https://img.shields.io/badge/deno__std-v0.18.0-green.svg)](https://github.com/denoland/deno_std)
[![tag](https://img.shields.io/badge/deno-v0.19.0-green.svg)](https://github.com/denoland/deno)

An experimental implementation of redis client for deno

## Usage

needs `--allow-net` privilege

**Stateless Commands**

```ts
import { connect } from "https://denopkg.com/keroxp/deno-redis/redis.ts";
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

### Pipelining

https://redis.io/topics/pipelining

```ts
const redis = await connect({
  hostname: "127.0.0.1",
  port: 6379
});
const pl = redis.pipeline();
await Promise.all([
  pl.ping(),
  pl.ping(),
  pl.set("set1", "value1"),
  pl.set("set2", "value2"),
  pl.mget("set1", "set2"),
  pl.del("set1"),
  pl.del("set2")
]);
const replies = await pl.flush();
```

### TxPipeline (pipeline with MULTI/EXEC)

We recommend to use `tx()` instead of `multi()/exec()` for transactional operation.  
`MULTI/EXEC` are potentially stateful operation so that operation's atomicity is guaranteed but redis's state may change between MULTI and EXEC.

`WATCH` is designed for these problems. You can ignore it by using TxPipeline because pipelined MULTI/EXEC commands are strictly executed in order at the time and no changes will happen during execution.

See detail https://redis.io/topics/transactions

```ts
const tx = redis.tx();
await Promise.all([tx.set("a", "aa"), tx.set("b", "bb"), tx.del("c")]);
await tx.flush();
// MULTI
// SET a aa
// SET b bb
// DEL c
// EXEC
```

## Compatibility Table (5.0.3)

### Connection

- [x] AUTH
- [x] ECHO
- [x] PING
- [x] QUIT
- [x] SELECT
- [x] SWAPDB

### Keys

- [x] DEL
- [x] DUMP
- [x] EXISTS
- [x] EXPIRE
- [x] EXPIREAT
- [x] KEYS
- [x] MIGRATE
- [x] MOVE
- [x] OBJECT
- [x] PERSIST
- [x] PEXPIRE
- [x] PEXPIREAT
- [x] PTTL
- [x] RANDOMKEY
- [x] RENAME
- [x] RENAMENX
- [x] RESTORE
- [x] SORT
- [x] TOUCH
- [x] TTL
- [x] TYPE
- [x] UNLINK
- [x] WAIT
- [x] SCAN

### String

- [x] APPEND
- [x] BITCOUNT
- [x] BITFIELD
- [x] BITOP
- [x] BITPOS
- [x] DECR
- [x] DECRBY
- [x] GET
- [x] GETBIT
- [x] GETRANGE
- [x] GETSET
- [x] INCR
- [x] INCRBY
- [x] INCRBYFLOAT
- [x] MGET
- [x] MSET
- [x] MSETNX
- [x] PSETEX
- [x] SET
- [x] SETBIT
- [x] SETEX
- [x] SETNX
- [x] SETRANGE
- [x] STRLEN

### List

- [x] BLPOP
- [x] BRPOP
- [x] BRPOPLPUSH
- [x] LINDEX
- [x] LINSERT
- [x] LLEN
- [x] LPOP
- [x] LPUSH
- [x] LPUSHX
- [x] LRANGE
- [x] LREM
- [x] LSET
- [x] LTRIM
- [x] RPOP
- [x] RPOPLPUSH
- [x] RPUSH
- [x] RPUSHX

### Set

- [x] SADD
- [x] SCARD
- [x] SDIFF
- [x] SDIFFSTORE
- [x] SINTER
- [x] SINTERSTORE
- [x] SISMEMBER
- [x] SMEMBERS
- [x] SMOVE
- [x] SPOP
- [x] SRANDMEMBER
- [x] SREM

### SortedSet

- [x] BZPOPMIN
- [x] BZPOPMAX
- [x] ZADD
- [x] ZCARD
- [x] ZCOUNT
- [x] ZINCRBY
- [x] ZINTERSTORE
- [x] ZLEXCOUNT
- [x] ZPOPMAX
- [x] ZPOPMIN
- [x] ZRANGE
- [x] ZRANGEBYLEX
- [x] ZREVRANGEBYLEX
- [x] ZRANGEBYSCORE
- [x] ZRANK
- [x] ZREM
- [x] ZREMRANGEBYLEX
- [x] ZREMRANGEBYRANK
- [x] ZREMRANGEBYSCORE
- [x] ZREVRANGE
- [x] ZREVRANGEBYSCORE
- [x] ZREVRANK
- [x] ZSCORE
- [x] ZUNIONSTORE
- [x] ZSCAN

### HashMap

- [x] HDEL
- [x] HEXISTS
- [x] HGET
- [x] HGETALL
- [x] HINCRBY
- [x] HINCRBYFLOAT
- [x] HKEYS
- [x] HLEN
- [x] HMGET
- [x] HMSET
- [x] HSET
- [x] HSETNX
- [x] HSTRLEN
- [x] HVALS
- [x] HSCAN

### GEO

- [x] GEOADD
- [x] GEOADD
- [x] GEOHASH
- [x] GEOPOS
- [x] GEODIST
- [x] GEORADIUS
- [x] GEORADIUSBYMEMBER

### Stream

WIP

### Server

WIP

### Cluster

None

### HyperLogLog

- [x] PFADD
- [x] PFCOUNT
- [x] PFMERGE

### Multi

- [x] MULTI
- [x] EXEC
- [x] DISCARD
- [x] WATCH
- [x] UNWATCH

### PubSub

- [x] PSUBSCRIBE
- [x] PUBSUB
- [x] PUBLISH
- [x] PUNSUBSCRIBE
- [x] SUBSCRIBE
- [x] UNSUBSCRIBE

### Scripting

- [x] EVAL
- [x] EVALSHA
- [x] SCRIPT DEBUG
- [x] SCRIPT EXISTS
- [x] SCRIPT FLUSH
- [x] SCRIPT KILL
- [x] SCRIPT LOAD
