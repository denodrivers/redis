# deno-redis
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

Still work in progress.

### Connection
-[x] AUTH 
-[ ] ECHO
-[ ] PING
-[x] QUIT
-[ ] SELECT 
-[ ] SWAPDB

### Keys 
-[x] DEL
-[ ] DUMP
-[x] EXISTS
-[ ] EXPIRE
-[ ] EXPIREAT
-[ ] KEYS 
-[ ] MIGRATE
-[ ] MOVE
-[ ] OBJECT
-[ ] PERSIST
-[ ] PEXPIRE
-[ ] PEXPIREAT
-[ ] PTTL
-[ ] RANDOMKEY
-[ ] RENAME
-[ ] RENAMENX
-[ ] RESTORE
-[ ] SORT
-[ ] TOUCH
-[ ] TTL
-[ ] TYPE
-[ ] UNLINK
-[ ] WAIT
-[ ] SCAN

### String

- [x] APPEND
- [ ] BITCOUNT
- [ ] BITFIELD
- [ ] BITOP
- [ ] BITPOS
- [x] DECR
- [x] DECRBY
- [x] GET
- [ ] GETBIT
- [x] GETRANGE / SUBSTR
- [x] GETSET
- [x] INCR
- [x] INCRBY
- [ ] INCRBYFLOAT
- [x] MGET
- [x] MSET
- [x] MSETNX
- [ ] PSETEX
- [x] SET
- [ ] SETBIT
- [x] SETEX
- [x] SETNX
- [ ] SETRANGE
- [ ] STRLEN

### List

- [ ] BLPOP
- [ ] BRPOP
- [ ] BRPOPLPUSH
- [x] LINDEX
- [ ] LINSERT
- [x] LLEN
- [x] LPOP 
- [x] LPUSH 
- [ ] LPUSHX
- [x] LRANGE
- [x] LREM
- [x] LSET
- [x] LTRIM
- [x] RPOP
- [ ] RPOPLPUSH
- [x] RPUSH
- [ ] RPUSHX

### Set
- [x] SADD
- [x] SCARD
- [ ] SDIFF
- [ ] SDIFFSTORE
- [ ] SINTER
- [ ] SINTERSTORE
- [x] SISMEMBER
- [ ] SMEMBERS
- [x] SMOVE
- [x] SPOP
- [ ] SRANDMEMBER
- [x] SREM


### SortedSet
-[ ] BZPOPMIN
-[ ] BZPOPMAX
-[x] ZADD
-[x] ZCARD 
-[x] ZCOUNT
-[x] ZINCRBY 
-[ ] ZINTERSTORE
-[ ] ZLEXCOUNT
-[ ] ZPOPMAX
-[ ] ZPOPMIN
-[x] ZRANGE 
-[ ] ZRANGEBYLEX 
-[ ] ZREVRANGEBYLEX
-[ ] ZRANGEBYSCORE
-[x] ZRANK
-[ ] ZREM
-[ ] ZREMRANGEBYLEX
-[ ] ZREMRANGEBYRANK
-[ ] ZREMRANGEBYSCORE
-[x] ZREVRANGE
-[x] ZREVRANGEBYSCORE
-[x] ZREVRANK
-[x] ZSCORE
-[ ] ZUNIONSTORE
-[ ] ZSCAN

### HashMap
-[ ] HDEL
-[ ] HEXISTS
-[ ] HGET
-[ ] HGETALL
-[ ] HINCRBY
-[ ] HINCRBYFLOAT
-[ ] HKEYS
-[ ] HLEN
-[ ] HMGET
-[ ] HMSET
-[ ] HSET
-[ ] HSETNX
-[ ] HSTRLEN
-[ ] HVALS 
-[ ] HSCAN
### Sort
- [ ] SORT

### GEO

none

### Stream

none

### Cluster

none

### HyperLogLog

none

### Multi
- [ ] MULTI 
- [ ] EXEC 
- [ ] DISCARD 
- [ ] WATCH
- [ ] UNWATCH

### PubSub
-[ ] PSUBSCRIBE
-[ ] PUBSUB
-[ ] PUBLISH
-[ ] PUNSUBSCRIBE
-[ ] SUBSCRIBE 
-[ ] UNSUBSCRIBE

### Scripting 

none

### Persistence
- [ ] SAVE
- [ ] BGSAVE
- [ ] LASTSAVE
- [ ] SHUTDOWN
- [ ] BGREWRITEAOF

###　Control

- [ ] INFO
- [ ] MONITOR
- [ ] SLAVEOF
- [ ] CONFIG