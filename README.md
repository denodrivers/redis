# deno-redis
[![Build Status](https://travis-ci.com/keroxp/deno-redis.svg?branch=master)](https://travis-ci.com/keroxp/deno-redis)

An experimental implementation of redis client for deno


## Usage

needs `--allow-net` privilege

```ts

import {connect} from "https://denopkg.com/keroxp/deno-redis/redis.ts"
const redis = await connect("127.0.0.1:6379");
const ok = await redis.set("hoge","fuga")
const fuga = await redis.get("hoge");

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

- [x]  PFADD
- [x]  PFCOUNT 
- [x]  PFMERGE 

### Multi
- [ ]  MULTI 
- [ ]  EXEC 
- [ ]  DISCARD 
- [ ]  WATCH
- [ ]  UNWATCH

### PubSub
- [ ]  PSUBSCRIBE
- [ ]  PUBSUB
- [ ]  PUBLISH
- [ ]  PUNSUBSCRIBE
- [ ]  SUBSCRIBE 
- [ ]  UNSUBSCRIBE

### Scripting 

- [x] EVAL
- [x] EVALSHA
- [x] SCRIPT DEBUG
- [x] SCRIPT EXISTS
- [x] SCRIPT FLUSH
- [x] SCRIPT KILL
- [x] SCRIPT LOAD
