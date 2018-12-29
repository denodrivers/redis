# deno-redis
An experimental implementation of redis client for deno

## Usage

!! WIP !!

Only commands below are supported.  

- GET
- SET
- DEL

```ts

import {connect} from "https://denopkg.com/keroxp/deno-redis/redis.ts"
const redis = await connect("127.0.0.1:6379");
const ok = await redis.set("hoge","fuga")
const fuga = await redis.get("hoge");

```