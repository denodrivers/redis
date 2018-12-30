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
- [ ] QUIT
- [ ] AUTH

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
- [ ] SETNX
- [ ] SETEX
- [ ] MSET
- [ ] MSETNX
- [x] INCR
- [x] INCRBY
- [x] DECR
- [x] DECRBY
- [ ] APPEND
- [ ] SUBSTR

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
- [ ] SADD
- [ ] SREM
- [ ] SPOP
- [ ] SMOVE
- [ ] SCARD
- [ ] SISMEMBER
- [ ] SINTER
- [ ] SINTERSTORE
- [ ] SUNION
- [ ] SUNIONSTORE
- [ ] SDIFF
- [ ] SDIFFSTORE
- [ ] SMEMBERS
- [ ] SRANDMEMBER

### SortedSet
- [ ] ZADD
- [ ] ZREM
- [ ] ZINCRBY
- [ ] ZRANK
- [ ] ZREVRANK
- [ ] ZRANGE
- [ ] ZREVRANGE
- [ ] ZRANGEBYSCORE
- [ ] ZCOUNT
- [ ] ZCARD
- [ ] ZSCORE
- [ ] ZREMRANGEBYRANK
- [ ] ZREMRANGEBYSCORE
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