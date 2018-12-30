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

## Compatibility Table

Still work in progress.

### Connection
- [x] QUIT
- [x] AUTH

### Common 
- [x] EXISTS
- [x] DEL
- [ ] TYPE
- [ ] KEYS
- [ ] RANDOMKEY
- [ ] RENAME
- [ ] RENAMENX
- [ ] DBSIZE
- [ ] EXPIRE
- [ ] PERSIST
- [ ] TTL
- [ ] SELECT
- [ ] MOVE
- [ ] FLUSHDB
- [ ] FLUSHALL
### String
- [x] SET
- [x] GET
- [x] GETSET
- [x] MGET
- [x] SETNX
- [x] SETEX
- [x] MSET
- [x] MSETNX
- [x] INCR
- [x] INCRBY
- [x] DECR
- [x] DECRBY
- [x] APPEND
- [x] SUBSTR / GETRANGE

### List
- [x] RPUSH
- [x] LPUSH
- [x] LLEN
- [x] LRANGE
- [x] LTRIM
- [x] LINDEX
- [x] LSET
- [x] LREM
- [x] LPOP
- [ ] RPOP
- [ ] BLPOP
- [ ] BRPOP
- [ ] RPOPLPUSH

### Set
- [x] SADD
- [x] SREM
- [x] SPOP
- [x] SMOVE
- [x] SCARD
- [x] SISMEMBER
- [ ] SINTER
- [ ] SINTERSTORE
- [ ] SUNION
- [ ] SUNIONSTORE
- [ ] SDIFF
- [ ] SDIFFSTORE
- [ ] SMEMBERS
- [ ] SRANDMEMBER

### SortedSet
- [x] ZADD
- [x] ZREM
- [x] ZINCRBY
- [x] ZRANK
- [x] ZREVRANK
- [ ] ZRANGE
- [ ] ZREVRANGE
- [x] ZRANGEBYSCORE
- [x] ZCOUNT
- [x] ZCARD
- [x] ZSCORE
- [x] ZREMRANGEBYRANK
- [x] ZREMRANGEBYSCORE
- [ ] ZUNIONSTORE / ZINTERSTORE

### HashMap
- [ ] HSET
- [ ] HGET
- [ ] HMGET
- [ ] HMSET
- [ ] HINCRBY
- [ ] HEXISTS
- [ ] HDEL
- [ ] HLEN
- [ ] HKEYS
- [ ] HVALS
- [ ] HGETALL

### Sort
- [ ] SORT

### Multi
- [ ] MULTI / EXEC / DISCARD / WATCH / UNWATCH

### PubSub
- [ ] SUBSCRIBE / UNSUBSCRIBE / PUBLISH

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