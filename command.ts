import { RedisSubscription } from "./pubsub.ts";
import { RedisPipeline } from "./pipeline.ts";
import {
  XReadReply,
  XReadOpts,
  XReadGroupOpts,
  XMaxlen,
  XClaimOpts,
  StartEndCount,
  XPendingReply,
  XId,
  XIdAdd,
  XIdGroupRead,
  XIdInput,
  XIdPos,
  XIdNeg,
  XKeyId,
  XKeyIdGroup,
  XMessage,
  XInfoStream,
  XAddFieldValues,
} from "./stream.ts";

export type Raw = Status | Integer | Bulk | ConditionalArray;
export type Status = string;
export type Integer = number;
export type Bulk = string | undefined;
export type BulkString = string;
export type BulkNil = undefined;
export type ConditionalArray = Raw[];
export type RedisCommands = {
  // Connection
  auth(password: string): Promise<Status>;
  auth(username: string, password: string): Promise<Status>;
  echo(message: string): Promise<BulkString>;
  ping(): Promise<Status>;
  ping(message: string): Promise<BulkString>;
  quit(): Promise<Status>;
  select(index: number): Promise<Status>;
  swapdb(index: number, index2: number): Promise<Status>;
  // Keys
  del(...keys: string[]): Promise<Integer>;
  dump(key: string): Promise<Bulk>;
  exists(...keys: string[]): Promise<Integer>;
  expire(key: string, seconds: number): Promise<Integer>;
  expireat(key: string, timestamp: string): Promise<Integer>;
  keys(pattern: string): Promise<BulkString[]>;
  migrate(
    host: string,
    port: number | string,
    key: string,
    destination_db: string,
    timeout: number,
    opts?: {
      copy?: boolean;
      replace?: boolean;
      keys?: string[];
    },
  ): Promise<Status>;
  move(key: string, db: string): Promise<Integer>;
  object_refcount(key: string): Promise<Integer | BulkNil>;
  object_encoding(key: string): Promise<Bulk>;
  object_ideltime(key: string): Promise<Integer | BulkNil>;
  // Return value may different
  object_freq(key: string): Promise<Integer>;
  object_help(): Promise<BulkString[]>;
  persist(key: string): Promise<Integer>;
  pexpire(key: string, milliseconds: number): Promise<Integer>;
  pexpireat(key: string, milliseconds_timestamp: number): Promise<Integer>;
  pttl(key: string): Promise<Integer>;
  randomkey(): Promise<Bulk>;
  rename(key: string, newkey: string): Promise<Status>;
  renamenx(key: string, newkey: string): Promise<Integer>;
  restore(
    key: string,
    ttl: number,
    serialized_value: string,
    replace?: boolean,
  ): Promise<Status>;

  sort(
    key: string,
    opts?: {
      by?: string;
      offset?: number;
      count?: number;
      patterns?: string[];
      order: "ASC" | "DESC";
      alpha?: boolean;
    },
  ): Promise<BulkString[]>;

  sort(
    key: string,
    opts?: {
      by?: string;
      offset?: number;
      count?: number;
      patterns?: string[];
      order: "ASC" | "DESC";
      alpha?: boolean;
      destination: string;
    },
  ): Promise<Integer>;

  touch(...keys: string[]): Promise<Integer>;
  ttl(key: string): Promise<Integer>;
  type(key: string): Promise<Status>;
  unlink(...keys: string[]): Promise<Integer>;
  wait(numreplicas: number, timeout: number): Promise<Integer>;
  // String
  append(key: string, value: string): Promise<Integer>;
  bitcount(key: string): Promise<Integer>;
  bitcount(key: string, start: number, end: number): Promise<Integer>;
  bitfield(key: string, opts?: {
    get?: { type: string; offset: number | string };
    set?: { type: string; offset: number | string; value: number };
    incrby?: { type: string; offset: number | string; increment: number };
  }): Promise<Integer[]>;
  bitfield(key: string, opts?: {
    get?: { type: string; offset: number };
    set?: { type: string; offset: number; value: number };
    incrby?: { type: string; offset: number; increment: number };
    overflow: "WRAP" | "SAT" | "FAIL";
  }): Promise<(Integer | BulkNil)[]>;
  bitop(
    operation: "AND" | "OR" | "XOR" | "NOT",
    destkey: string,
    ...keys: string[]
  ): Promise<Integer>;
  bitpos(
    key: string,
    bit: number,
    start?: number,
    end?: number,
  ): Promise<Integer>;
  decr(key: string): Promise<Integer>;
  decrby(key: string, decrement: number): Promise<Integer>;
  incr(key: string): Promise<Integer>;
  incrby(key: string, increment: number): Promise<Integer>;
  incrbyfloat(key: string, increment: number): Promise<Bulk>;
  mget(...keys: string[]): Promise<Bulk[]>;
  mset(key: string, value: string): Promise<Status>;
  mset(...key_values: string[]): Promise<Status>;
  msetnx(key: string, value: string): Promise<Integer>;
  msetnx(...key_values: string[]): Promise<Integer>;
  psetex(key: string, milliseconds: number, value: string): Promise<Status>;
  set(
    key: string,
    value: string,
    opts?: {
      ex?: number;
      px?: number;
    },
  ): Promise<Status>;
  set(
    key: string,
    value: string,
    opts: {
      ex?: number;
      px?: number;
      mode: "NX" | "XX";
    },
  ): Promise<Status | BulkNil>;
  setbit(key: string, offset: number, value: string): Promise<Integer>;
  setex(key: string, seconds: number, value: string): Promise<Status>;
  setnx(key: string, value: string): Promise<Integer>;
  setrange(key: string, offset: number, value: string): Promise<Integer>;
  strlen(key: string): Promise<Integer>;
  get(key: string): Promise<Bulk>;
  getbit(key: string, offset: number): Promise<Integer>;
  getrange(key: string, start: number, end: number): Promise<BulkString>;
  getset(key: string, value: string): Promise<Bulk>;
  // Geo
  geoadd(
    key: string,
    longitude: number,
    latitude: number,
    member: string,
  ): Promise<Integer>;
  geoadd(
    key: string,
    ...longitude_latitude_member: [number, number, string][]
  ): Promise<Integer>;
  geohash(key: string, ...members: string[]): Promise<Bulk[]>;
  geopos(key: string, ...members: string[]): Promise<
    ([Integer, Integer] | BulkNil)[]
  >;
  geodist(
    key: string,
    member1: string,
    member2: string,
    unit?: "m" | "km" | "ft" | "mi",
  ): Promise<Bulk>;
  // FIXME: Return type is too conditional
  georadius(
    key: string,
    longitude: number,
    latitude: number,
    radius: number,
    unit: "m" | "km" | "ft" | "mi",
    opts?: {
      withCoord?: boolean;
      withDist?: boolean;
      withHash?: boolean;
      count?: number;
      sort?: "ASC" | "DESC";
      store?: string;
      storeDist?: string;
    },
  ): Promise<ConditionalArray>;
  // FIXME: Return type is too conditional
  georadiusbymember(
    key: string,
    member: string,
    radius: number,
    unit: "m" | "km" | "ft" | "mi",
    opts?: {
      withCoord?: boolean;
      withDist?: boolean;
      withHash?: boolean;
      count?: number;
      sort?: "ASC" | "DESC";
      store?: string;
      storeDist?: string;
    },
  ): Promise<ConditionalArray>;
  // Hash
  hdel(key: string, ...fields: string[]): Promise<Integer>;
  hexists(key: string, field: string): Promise<Integer>;
  hget(key: string, field: string): Promise<Bulk>;
  hgetall(key: string): Promise<BulkString[]>;
  hincrby(key: string, field: string, increment: number): Promise<Integer>;
  hincrbyfloat(key: string, field: string, increment: number): Promise<
    BulkString
  >;
  hkeys(key: string): Promise<BulkString[]>;
  hlen(key: string): Promise<Integer>;
  hmget(key: string, ...fields: string[]): Promise<Bulk[]>;
  /** @deprecated >= 4.0.0 use hset */
  hmset(key: string, field: string, value: string): Promise<Status>;
  /** @deprecated >= 4.0.0 use hset */
  hmset(key: string, ...field_values: string[]): Promise<Status>;
  hset(key: string, field: string, value: string): Promise<Integer>;
  hset(key: string, ...field_values: string[]): Promise<Integer>;
  hsetnx(key: string, field: string, value: string): Promise<Integer>;
  hstrlen(key: string, field: string): Promise<Integer>;
  hvals(key: string): Promise<BulkString[]>;
  // List
  blpop(key: string | string[], timeout: number): Promise<Bulk[]>;
  brpop(key: string | string[], timeout: number): Promise<Bulk[]>;
  brpoplpush(
    source: string,
    destination: string,
    timeout: number,
  ): Promise<Bulk | []>;
  lindex(key: string, index: number): Promise<Bulk>;
  linsert(
    key: string,
    loc: "BEFORE" | "AFTER",
    pivot: string,
    value: string,
  ): Promise<Integer>;
  llen(key: string): Promise<Integer>;
  lpop(key: string): Promise<Bulk>;
  lpush(key: string, ...values: string[]): Promise<Integer>;
  lpushx(key: string, value: string): Promise<Integer>;
  lrange(key: string, start: number, stop: number): Promise<BulkString[]>;
  lrem(key: string, count: number, value: string): Promise<Integer>;
  lset(key: string, index: number, value: string): Promise<Status>;
  ltrim(key: string, start: number, stop: number): Promise<Status>;
  rpop(key: string): Promise<Bulk>;
  rpoplpush(source: string, destination: string): Promise<Bulk>;
  rpush(key: string, ...values: string[]): Promise<Integer>;
  rpushx(key: string, value: string): Promise<Integer>;
  // HypeprLogLog
  pfadd(key: string, ...elements: string[]): Promise<Integer>;
  pfcount(...keys: string[]): Promise<Integer>;
  pfmerge(destkey: string, ...sourcekeys: string[]): Promise<Status>;
  // PubSub
  publish(channel: string, message: string): Promise<Integer>;
  psubscribe(...patterns: string[]): Promise<RedisSubscription>;
  subscribe(...channels: string[]): Promise<RedisSubscription>;
  pubsub_channels(pattern: string): Promise<BulkString[]>;
  pubsub_numsubs(...channels: string[]): Promise<[BulkString, Integer][]>;
  pubsub_numpat(): Promise<Integer>;
  // Cluster
  readonly(): Promise<Status>;
  readwrite(): Promise<Status>;
  // Set
  sadd(key: string, ...members: string[]): Promise<Integer>;
  scard(key: string): Promise<Integer>;
  sdiff(...keys: string[]): Promise<BulkString[]>;
  sdiffstore(destination: string, ...keys: string[]): Promise<Integer>;
  sinter(...keys: string[]): Promise<BulkString[]>;
  sinterstore(destination: string, ...keys: string[]): Promise<Integer>;
  sismember(key: string, member: string): Promise<Integer>;
  smembers(key: string): Promise<BulkString[]>;
  smove(source: string, destination: string, member: string): Promise<
    Integer
  >;
  spop(key: string): Promise<Bulk>;
  spop(key: string, count: number): Promise<BulkString[]>;
  srandmember(key: string): Promise<Bulk>;
  srandmember(key: string, count: number): Promise<BulkString[]>;
  srem(key: string, ...members: string[]): Promise<Integer>;
  sunion(...keys: string[]): Promise<BulkString[]>;
  sunionstore(destination: string, ...keys: string[]): Promise<Integer>;
  // Stream
  /**
   * The XACK command removes one or multiple messages 
   * from the pending entries list (PEL) of a stream
   *  consumer group. A message is pending, and as such
   *  stored inside the PEL, when it was delivered to 
   * some consumer, normally as a side effect of calling
   *  XREADGROUP, or when a consumer took ownership of a
   *  message calling XCLAIM. The pending message was 
   * delivered to some consumer but the server is yet not
   *  sure it was processed at least once. So new calls
   *  to XREADGROUP to grab the messages history for a 
   * consumer (for instance using an XId of 0), will 
   * return such message. Similarly the pending message 
   * will be listed by the XPENDING command, that 
   * inspects the PEL.
   * 
   * Once a consumer successfully processes a message, 
   * it should call XACK so that such message does not 
   * get processed again, and as a side effect, the PEL
   * entry about this message is also purged, releasing 
   * memory from the Redis server.
   * 
   * @param key the stream key
   * @param group the group name
   * @param ids the ids to acknowledge
   */
  xack(key: string, group: string, ...xids: XIdInput[]): Promise<Integer>;
  /**
   * Write a message to a stream.
   * 
   * Returns bulk string reply, specifically:
   * The command returns the XId of the added entry. 
   * The XId is the one auto-generated if * is passed 
   * as XId argument, otherwise the command just returns
   *  the same XId specified by the user during insertion.
   * @param key  write to this stream
   * @param id the XId of the entity written to the stream
   * @param field_values  record object or map of field value pairs
   */
  xadd(
    key: string,
    xid: XIdAdd,
    field_values: XAddFieldValues,
  ): Promise<XId>;
  /**
   * Write a message to a stream.
   * 
   * Returns bulk string reply, specifically:
   * The command returns the XId of the added entry. 
   * The XId is the one auto-generated if * is passed 
   * as XId argument, otherwise the command just returns
   *  the same XId specified by the user during insertion.
   * @param key  write to this stream
   * @param id the XId of the entity written to the stream
   * @param field_values  record object or map of field value pairs
   * @param maxlen  number of elements, and whether or not to use an approximate comparison
   */
  xadd(
    key: string,
    xid: XIdAdd,
    field_values: Record<string, string> | Map<string, string>,
    maxlen: XMaxlen,
  ): Promise<XId>;
  /**
   * In the context of a stream consumer group, this command changes the ownership of a pending message, so that the new owner is the
   * consumer specified as the command argument.
   * 
   * It returns the claimed messages unless called with the JUSTIDs
   * option, in which case it returns only their XIds.
   * 
   * This is a complex command!  Read more at https://redis.io/commands/xclaim
   *
<pre>
XCLAIM mystream mygroup Alice 3600000 1526569498055-0
1) 1) 1526569498055-0
   2) 1) "message"
      2) "orange"
</pre>

   * @param key the stream name
   * @param opts Various arguments for the command.  The following are required:
   *    GROUP: the name of the consumer group which will claim the messages
   *    CONSUMER: the specific consumer which will claim the message
   *    MIN-IDLE-TIME:  claim messages whose idle time is greater than this number (milliseconds)
   * 
   * The command has multiple options which can be omitted, however
   * most are mainly for internal use in order to transfer the
   * effects of XCLAIM or other commands to the AOF file and to
   * propagate the same effects to the slaves, and are unlikely to
   * be useful to normal users:
   *    IDLE <ms>: Set the idle time (last time it was delivered) of the message. If IDLE is not specified, an IDLE of 0 is assumed, that is, the time count is reset because the message has now a new owner trying to process it.
   *    TIME <ms-unix-time>: This is the same as IDLE but instead of a relative amount of milliseconds, it sets the idle time to a specific Unix time (in milliseconds). This is useful in order to rewrite the AOF file generating XCLAIM commands.
   *    RETRYCOUNT <count>: Set the retry counter to the specified value. This counter is incremented every time a message is delivered again. Normally XCLAIM does not alter this counter, which is just served to clients when the XPENDING command is called: this way clients can detect anomalies, like messages that are never processed for some reason after a big number of delivery attempts.
   *    FORCE: Creates the pending message entry in the PEL even if certain specified XIds are not already in the PEL assigned to a different client. However the message must be exist in the stream, otherwise the XIds of non existing messages are ignored.
   *    JUSTID: Return just an array of XIds of messages successfully claimed, without returning the actual message. Using this option means the retry counter is not incremented.
   * @param ids the message XIds to claim
   */
  xclaim(
    key: string,
    opts: XClaimOpts,
    ...xids: XIdInput[]
  ): Promise<ConditionalArray>;
  /**
   * Removes the specified entries from a stream, 
   * and returns the number of entries deleted,
   * that may be different from the number of
   * XIds passed to the command in case certain 
   * XIds do not exist.
   * 
   * @param key the stream key
   * @param ids ids to delete
   */
  xdel(key: string, ...xids: XIdInput[]): Promise<Integer>;
  /**
   * This command is used to create a new consumer group associated
   * with a stream.
   * 
   * <pre>
   XGROUP CREATE test-man-000 test-group $ MKSTREAM
   OK
   </pre>
   * 
   * See https://redis.io/commands/xgroup
   * @param key stream key
   * @param groupName the name of the consumer group
   * @param id The last argument is the XId of the last
   *            item in the stream to consider already
   *            delivered. In the above case we used the
   *            special XId '$' (that means: the XId of the
   *            last item in the stream). In this case
   *            the consumers fetching data from that
   *            consumer group will only see new elements
   *            arriving in the stream.  If instead you
   *            want consumers to fetch the whole stream
   *            history, use zero as the starting XId for
   *            the consumer group
   * @param mkstream You can use the optional MKSTREAM subcommand as the last argument after the XId to automatically create the stream, if it doesn't exist. Note that if the stream is created in this way it will have a length of 0.
   */
  xgroupcreate(
    key: string,
    groupName: string,
    xid: XIdInput | "$",
    mkstream?: boolean,
  ): Promise<Status>;
  /**
   * Delete a specific consumer from a group, leaving
   * the group itself intact.
   * 
   * <pre>
XGROUP DELCONSUMER test-man-000 hellogroup 4
(integer) 0
</pre>
   * @param key stream key
   * @param groupName the name of the consumer group
   * @param consumerName the specific consumer to delete
   */
  xgroupdelconsumer(
    key: string,
    groupName: string,
    consumerName: string,
  ): Promise<Integer>;
  /**
   * Destroy a consumer group completely.  The consumer 
   * group will be destroyed even if there are active 
   * consumers and pending messages, so make sure to
   * call this command only when really needed.
   * 
<pre>
XGROUP DESTROY test-man-000 test-group
(integer) 1
</pre>
   * @param key stream key
   * @param groupName the consumer group to destroy
   */
  xgroupdestroy(key: string, groupName: string): Promise<Integer>;
  /** A support command which displays text about the 
   * various subcommands in XGROUP. */
  xgrouphelp(): Promise<BulkString>;
  /**
     * Finally it possible to set the next message to deliver
     * using the SETID subcommand. Normally the next XId is set
     * when the consumer is created, as the last argument of
     * XGROUP CREATE. However using this form the next XId can
     * be modified later without deleting and creating the
     * consumer group again. For instance if you want the
     * consumers in a consumer group to re-process all the
     * messages in a stream, you may want to set its next ID
     * to 0:
<pre>
XGROUP SETID mystream consumer-group-name 0
</pre>
     * 
     * @param key  stream key
     * @param groupName   the consumer group
     * @param id the XId to use for the next message delivered
     */
  xgroupsetid(
    key: string,
    groupName: string,
    xid: XIdInput,
  ): Promise<Status>;
  xinfostream(key: string): Promise<XInfoStream>;
  /**
   *  returns the entire state of the stream, including entries, groups, consumers and PELs. This form is available since Redis 6.0.
   * @param key The stream key
   */
  xinfostreamfull(key: string): void;
  /**
   * Get as output all the consumer groups associated 
   * with the stream.
   * 
   * @param key the stream key
   */
  xinfogroups(key: string): void;
  /**
   * Get the list of every consumer in a specific 
   * consumer group.
   * 
   * @param key the stream key
   * @param group list consumers for this group
   */
  xinfoconsumers(key: string, group: string): void;
  /**
   * Print help text about the low level syntax.
   */
  xinfohelp(): void;
  /**
   * Returns the number of entries inside a stream. If the specified key does not exist the command returns zero, as if the stream was empty. However note that unlike other Redis types, zero-length streams are possible, so you should call TYPE or EXISTS in order to check if a key exists or not.
   * @param key  the stream key to inspect
   */
  xlen(key: string): Promise<Integer>;
  xpending(
    key: string,
    group: string,
    startEndCount?: StartEndCount,
    consumer?: string,
  ): Promise<XPendingReply>;
  /**
   * The command returns the stream entries matching a given 
   * range of XIds. The range is specified by a minimum and
   * maximum ID. All the entries having an XId between the
   * two specified or exactly one of the two XIds specified
   * (closed interval) are returned.
   * 
   * The command also has a reciprocal command returning 
   * items in the reverse order, called XREVRANGE, which 
   * is otherwise identical.
   * 
   * The - and + special XIds mean respectively the minimum
   * XId possible and the maximum XId possible inside a stream,
   * so the following command will just return every
   * entry in the stream.

<pre>
XRANGE somestream - +
</pre>
   * @param key  stream key
   * @param start beginning XId, or -
   * @param end  final XId, or +
   * @param count max number of entries to return
   */
  xrange(
    key: string,
    start: XIdNeg,
    end: XIdPos,
    count?: number,
  ): Promise<XMessage[]>;
  /**
   * This command is exactly like XRANGE, but with the 
   * notable difference of returning the entries in 
   * reverse order, and also taking the start-end range 
   * in reverse order: in XREVRANGE you need to state the
   *  end XId and later the start ID, and the command will
   *  produce all the element between (or exactly like) 
   * the two XIds, starting from the end side.
   * 
   * @param key  the stream key
   * @param start   reading backwards, start from this XId.  for the maximum, specify "+"
   * @param end  stop at this XId.  for the minimum, specify "-"
   * @param count max number of entries to return
   */
  xrevrange(
    key: string,
    start: XIdPos,
    end: XIdNeg,
    count?: number,
  ): Promise<XMessage[]>;
  xread(
    key_xids: XKeyId[],
    opts?: XReadOpts,
  ): Promise<XReadReply>;
  /**
   * The XREADGROUP command is a special version of the XREAD command with support for consumer groups. 
   *  
   * @param key_ids { key, id } pairs to read
   * @param opts you must specify group name and consumer name.  
   *              those must be created using the XGROUP command,
   *              prior to invoking this command.  you may optionally
   *              include a count of records to read, and the number
   *              of milliseconds to block
   */
  xreadgroup(
    key_xids: XKeyIdGroup[],
    opts: XReadGroupOpts,
  ): Promise<XReadReply>;

  /**
   * Trims the stream to the indicated number
   * of elements.  
<pre>XTRIM mystream MAXLEN 1000</pre>
   * @param key 
   * @param maxlen 
   */
  xtrim(key: string, maxlen: XMaxlen): Promise<Integer>;
  // SortedSet
  bzpopmin(key: string | string[], timeout: number): Promise<
    [BulkString, BulkString, BulkString] | []
  >;
  bzpopmax(key: string | string[], timeout: number): Promise<
    [BulkString, BulkString, BulkString] | []
  >;
  zadd(
    key: string,
    score: number,
    member: string,
    opts?: {
      nxx?: "NX" | "XX";
      ch?: boolean;
      incr?: boolean;
    },
  ): Promise<Integer>;
  zadd(
    key: string,
    score_members: [number, string][],
    opts?: {
      nxx?: "NX" | "XX";
      ch?: boolean;
      incr?: boolean;
    },
  ): Promise<Integer>;
  zcard(key: string): Promise<Integer>;
  zcount(key: string, min: number, max: number): Promise<Integer>;
  zincrby(key: string, increment: number, member: string): Promise<BulkString>;
  zinterstore(
    destination: string,
    numkeys: number,
    keys: string | string[],
    weights?: number | number[],
    aggregate?: "SUM" | "MIN" | "MAX",
  ): Promise<Integer>;
  zlexcount(key: string, min: string, max: string): Promise<Integer>;
  zpopmax(key: string, count?: number): Promise<BulkString[]>;
  zpopmin(key: string, count?: number): Promise<BulkString[]>;
  zrange(
    key: string,
    start: number,
    stop: number,
    opts?: {
      withScore?: boolean;
    },
  ): Promise<BulkString[]>;
  zrangebylex(
    key: string,
    min: string,
    max: string,
    opts?: {
      offset?: number;
      count?: number;
    },
  ): Promise<BulkString[]>;
  zrevrangebylex(
    key: string,
    max: number | string,
    min: number | string,
    opts?: {
      offset?: number;
      count?: number;
    },
  ): Promise<BulkString[]>;
  zrangebyscore(
    key: string,
    min: number | string,
    max: number | string,
    opts?: {
      withScore?: boolean;
      offset?: number;
      count?: number;
    },
  ): Promise<BulkString[]>;
  zrank(key: string, member: string): Promise<Integer | BulkNil>;
  zrem(key: string, ...members: string[]): Promise<Integer>;
  zremrangebylex(key: string, min: string, max: string): Promise<Integer>;
  zremrangebyrank(key: string, start: number, stop: number): Promise<Integer>;
  zremrangebyscore(key: string, min: number, max: number): Promise<Integer>;
  zrevrange(
    key: string,
    start: number,
    stop: number,
    opts?: {
      withScore?: boolean;
    },
  ): Promise<BulkString[]>;
  zrevrangebyscore(
    key: string,
    max: number,
    min: number,
    ops?: {
      withScore?: boolean;
      offset?: number;
      count?: number;
    },
  ): Promise<BulkString[]>;
  zrevrank(key: string, member: string): Promise<Integer | BulkNil>;
  zscore(key: string, member: string): Promise<Bulk>;
  zunionstore(
    destination: string,
    keys: string[],
    opts?: {
      weights?: number[];
      aggregate?: "SUM" | "MIN" | "MAX";
    },
  ): Promise<Integer>;
  // Cluster
  // cluster //
  // Server
  acl_cat(parameter?: string): Promise<BulkString[]>;
  acl_deluser(parameter: string): Promise<Integer>;
  acl_genpass(parameter?: number): Promise<Status>;
  acl_getuser(parameter: string): Promise<BulkString[]>;
  acl_help(): Promise<BulkString[]>;
  acl_list(): Promise<BulkString[]>;
  acl_load(): Promise<Status>;
  acl_log(parameter: string | number): Promise<Status | BulkString[]>;
  acl_save(): Promise<Status>;
  acl_setuser(username: string, rule: string): Promise<Status>;
  acl_users(): Promise<BulkString[]>;
  acl_whoami(): Promise<Status>;
  bgrewriteaof(): Promise<Status>;
  bgsave(): Promise<Status>;
  // client //
  command(): Promise<
    [BulkString, Integer, BulkString[], Integer, Integer, Integer]
  >;
  command_count(): Promise<Integer>;
  command_getkeys(): Promise<BulkString[]>;
  command_info(...command_names: string[]): Promise<[
    [
      BulkString,
      Integer,
      BulkString[],
      Integer,
      Integer,
      Integer,
      [BulkString[]],
    ] | BulkNil,
  ]>;
  config_get(parameter: string): Promise<BulkString[]>;
  config_rewrite(): Promise<Status>;
  config_set(parameter: string, value: string): Promise<Status>;
  config_resetstat(): Promise<Status>;
  dbsize(): Promise<Integer>;
  debug_object(key: string): Promise<Status>;
  debug_segfault(): Promise<Status>;
  flushall(async?: boolean): Promise<Status>;
  flushdb(async?: boolean): Promise<Status>;
  info(section?: string): Promise<Status>;
  lastsave(): Promise<Integer>;
  memory_doctor(): Promise<Status>;
  memory_help(): Promise<BulkString[]>;
  memory_malloc_stats(): Promise<Status>;
  memory_purge(): Promise<Status>;
  memory_stats(): Promise<ConditionalArray>;
  memory_usage(
    key: string,
    opts?: {
      samples?: number;
    },
  ): Promise<Integer>;
  module_list(): Promise<BulkString[]>;
  module_load(path: string, args: string): Promise<Status>;
  module_unload(name: string): Promise<Status>;
  monitor(): void;
  role(): Promise<
    | ["master", Integer, BulkString[][]]
    | ["slave", BulkString, Integer, BulkString, Integer]
    | ["sentinel", BulkString[]]
  >;
  save(): Promise<Status>;
  shutdown(arg: "NOSAVE" | "SAVE"): Promise<Status>;
  slaveof(host: string, port: string | number): Promise<Status>;
  replicaof(host: string, port: string | number): Promise<Status>;
  slowlog(subcommand: string, ...argument: string[]): Promise<
    ConditionalArray
  >;
  sync(): void;
  time(): Promise<[BulkString, BulkString]>;
  // Scripting
  eval(script: string, numkeys: number, key: string, arg: string): Promise<Raw>;
  eval(
    script: string,
    numkeys: number,
    keys: string[],
    args: string[],
  ): Promise<Raw>;
  evalsha(
    sha1: string,
    numkeys: number,
    key: string,
    arg: string,
  ): Promise<Raw>;
  evalsha(
    sha1: string,
    numkeys: number,
    keys: string[],
    args: string[],
  ): Promise<Raw>;
  script_debug(arg: "YES" | "SYNC" | "NO"): Promise<Status>;
  script_exists(...sha1s: string[]): Promise<Integer[]>;
  script_flush(): Promise<Status>;
  script_kill(): Promise<Status>;
  script_load(script: string): Promise<Status>;
  // Transactions
  discard(): Promise<Status>;
  exec(): Promise<ConditionalArray>;
  multi(): Promise<Status>;
  unwatch(): Promise<Status>;
  watch(...keys: string[]): Promise<Status>;
  // pipeline
  tx(): RedisPipeline;
  pipeline(): RedisPipeline;
  // scan
  scan(
    cursor: number,
    opts?: {
      pattern?: string;
      count?: number;
    },
  ): Promise<[BulkString, BulkString[]]>;
  hscan(
    key: string,
    cursor: number,
    opts?: {
      pattern?: string;
      count?: number;
    },
  ): Promise<[BulkString, BulkString[]]>;
  sscan(
    key: string,
    cursor: number,
    opts?: {
      pattern?: string;
      count?: number;
    },
  ): Promise<[BulkString, BulkString[]]>;
  zscan(
    key: string,
    cursor: number,
    opts?: {
      pattern?: string;
    },
  ): Promise<[BulkString, BulkString[]]>;

  readonly isClosed: boolean;
  readonly isConnected: boolean;
  close(): void;
};
