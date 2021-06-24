/**
 * Base on https://github.com/antirez/redis-rb-cluster which is licensed as follows:
 *
 * Copyright (C) 2013 Salvatore Sanfilippo <antirez@gmail.com>
 *
 * Permission is hereby granted, free of charge, to any person obtaining
 * a copy of this software and associated documentation files (the
 * "Software"), to deal in the Software without restriction, including
 * without limitation the rights to use, copy, modify, merge, publish,
 * distribute, sublicense, and/or sell copies of the Software, and to
 * permit persons to whom the Software is furnished to do so, subject to
 * the following conditions:
 *
 * The above copyright notice and this permission notice shall be
 * included in all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
 * EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
 * MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
 * NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE
 * LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION
 * OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION
 * WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */

import { connect, RedisImpl } from "../../redis.ts";
import { Connection } from "../../connection.ts";
import type { Redis } from "../../redis.ts";
import uniqBy from "https://cdn.skypack.dev/lodash.uniqby@4.5.0"; // TODO: Import `lodash.uniqby` from `vendor` directory
import type { RedisReply, RedisValue } from "../../protocol/mod.ts";
import calculateSlot from "https://cdn.skypack.dev/cluster-key-slot@1.1.0";
import shuffle from "https://cdn.skypack.dev/lodash.shuffle@4.2.0";
import sample from "https://cdn.skypack.dev/lodash.sample@4.2.1";
import { ErrorReplyError } from "../../errors.ts";

export interface ClusterConnectOptions {
  nodes: Array<NodeOptions>;
  maxConnections: number;
}

export interface NodeOptions {
  hostname: string;
  port?: number;
}

interface SlotMap {
  [slot: number]: ClusterNode;
}

class ClusterNode {
  readonly name: string;

  constructor(readonly hostname: string, readonly port: number) {
    this.name = `${hostname}:${port}`;
  }
}

const kRedisClusterRequestTTL = 16;

class ClusterError extends Error {}

// TODO: This class should implement CommandExecutor interface.
class ClusterExecutor {
  #nodes!: ClusterNode[];
  #slots!: SlotMap;
  #startupNodes: ClusterNode[];
  #refreshTableASAP?: boolean;
  #maxConnections: number;
  #connectionByNodeName: { [name: string]: Redis } = {};

  constructor(opts: ClusterConnectOptions) {
    this.#startupNodes = opts.nodes.map((node) =>
      new ClusterNode(node.hostname, node.port ?? 6379)
    );
    this.#maxConnections = opts.maxConnections;
  }

  get connection(): Connection {
    throw new Error("Not implemented yet");
  }

  async exec(command: string, ...args: RedisValue[]): Promise<RedisReply> {
    if (this.#refreshTableASAP) {
      await this.initializeSlotsCache();
    }
    const key = getKeyFromCommand(command, args);
    if (key == null) {
      throw new ClusterError(
        "No way to dispatch this command to Redis Cluster.",
      );
    }
    const slot = calculateSlot(key);
    let asking = false;
    let tryRandomNode = false;
    let ttl = kRedisClusterRequestTTL;
    let lastError: null | Error;
    while (ttl > 0) {
      ttl -= 1;
      let r: Redis;
      if (tryRandomNode) {
        r = await this.#getRandomConnection();
        tryRandomNode = false;
      } else {
        r = await this.#getConnectionBySlot(slot);
      }

      try {
        if (asking) {
          await r.asking();
        }
        asking = false;
        const reply = await r.executor.exec(command, ...args);
        return reply;
      } catch (err) {
        lastError = err;
        if (err instanceof Deno.errors.BadResource) {
          tryRandomNode = true;
          continue;
        } else if (err instanceof ErrorReplyError) {
          const [code, newSlot, ipAndPort] = err.message.split(/\s+/);
          if (code === "MOVED" || code === "ASK") {
            if (code === "ASK") {
              asking = true;
            } else {
              // Serve replied with MOVED. It's better for us to
              // ask for CLUSTER NODES the next time.
              this.#refreshTableASAP = true;
            }
            if (!asking) {
              const [ip, port] = ipAndPort.split(":");
              this.#slots[parseInt(newSlot)] = new ClusterNode(
                ip,
                parseInt(port),
              );
            }
          } else {
            throw err;
          }
        } else {
          throw err; // An unexpected error occurred.
        }
      }
    }
    throw new ClusterError(
      `Too many Cluster redirections? (last error: ${lastError!.message ??
        ""})`,
    );
  }

  async initializeSlotsCache(): Promise<void> {
    for (const node of this.#startupNodes) {
      try {
        const redis = await getRedisLink(node);
        const clusterSlots = await redis.clusterSlots() as Array<
          [number, number, [string, number]]
        >;
        const nodes = [] as ClusterNode[];
        const slotMap = {} as SlotMap;
        for (const [from, to, master] of clusterSlots) {
          for (let slot = from; slot <= to; slot++) {
            const [ip, port] = master;
            const name = `${ip}:${port}`;
            const node = {
              name,
              hostname: ip,
              port,
            };
            nodes.push(node);
            slotMap[slot] = node;
          }
        }
        this.#nodes = nodes;
        this.#slots = slotMap;
        await this.#populateStartupNodes();
        this.#refreshTableASAP = false;
        return;
      } catch (_err) {
        // TODO: Consider logging `_err` here
        continue;
      }
    }
  }

  #populateStartupNodes() {
    for (const node of this.#nodes) {
      this.#startupNodes.push(node);
    }

    this.#startupNodes = uniqBy(
      this.#startupNodes,
      (node: ClusterNode) => node.name,
    );
  }

  async #getRandomConnection(): Promise<Redis> {
    for (const node of shuffle(this.#startupNodes)) {
      try {
        let conn = this.#connectionByNodeName[node.name];
        if (conn) {
          const message = await conn.ping();
          if (message === "PONG") {
            return conn;
          }
        } else {
          conn = await getRedisLink(node);
          try {
            const message = await conn.ping();
            if (message === "PONG") {
              await this.#closeExistingConnection();
              this.#connectionByNodeName[node.name] = conn;
              return conn;
            }
          } catch {
            conn.close();
          }
        }
      } catch {
        // Just try with the next node.
      }
    }
    throw new ClusterError("Can't reach a single startup node.");
  }

  async #getConnectionBySlot(slot: number): Promise<Redis> {
    const node = this.#slots[slot];
    if (!node) {
      return this.#getRandomConnection();
    }
    const conn = this.#connectionByNodeName[node.name];
    if (!conn) {
      try {
        await this.#closeExistingConnection();
        this.#connectionByNodeName[node.name] = await getRedisLink(node);
      } catch {
        return this.#getRandomConnection();
      }
    }
    return conn;
  }

  async #closeExistingConnection() {
    const nodeNames = Object.keys(this.#connectionByNodeName);
    while (nodeNames.length >= this.#maxConnections) {
      const nodeName = sample(nodeNames);
      const conn = this.#connectionByNodeName[nodeName];
      delete this.#connectionByNodeName[nodeName];
      try {
        await conn.quit();
      } catch {}
    }
  }
}

function getRedisLink(node: ClusterNode): Promise<Redis> {
  return connect(node);
}

function getKeyFromCommand(command: string, args: RedisValue[]): string | null {
  switch (command.toLowerCase()) {
    case "info":
    case "multi":
    case "exec":
    case "slaveof":
    case "config":
    case "shutdown":
      return null;
    default:
      return args[1] as string;
  }
}

async function connectCluster(opts: ClusterConnectOptions) {
  const executor = new ClusterExecutor(opts);
  await executor.initializeSlotsCache();
  return new RedisImpl(executor);
}

export { connectCluster as connect };
