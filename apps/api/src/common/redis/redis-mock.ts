/**
 * In-memory Redis mock for local development when no Redis server is available.
 * Implements just enough of the ioredis interface for BullMQ to initialise
 * without crashing. Queue jobs will not be processed — that's fine for UI dev.
 */
export class RedisMock {
  private store = new Map<string, any>();
  private subscribers = new Map<string, Function[]>();
  status = 'ready';
  // BullMQ's isRedisInstance() checks for connect + disconnect + duplicate
  options = { enableReadyCheck: false, maxRetriesPerRequest: null };
  async connect() { return this; }

  async get(key: string) { return this.store.get(key) ?? null; }
  async set(key: string, value: any) { this.store.set(key, value); return 'OK'; }
  async del(...keys: string[]) { keys.forEach(k => this.store.delete(k)); return keys.length; }
  async exists(...keys: string[]) { return keys.filter(k => this.store.has(k)).length; }
  async expire() { return 1; }
  async ttl() { return -1; }
  async incr(key: string) { const v = (this.store.get(key) ?? 0) + 1; this.store.set(key, v); return v; }
  async lpush(key: string, ...vals: any[]) { const a = this.store.get(key) ?? []; a.unshift(...vals); this.store.set(key, a); return a.length; }
  async rpush(key: string, ...vals: any[]) { const a = this.store.get(key) ?? []; a.push(...vals); this.store.set(key, a); return a.length; }
  async lrange(key: string, start: number, stop: number) { const a = this.store.get(key) ?? []; return stop === -1 ? a.slice(start) : a.slice(start, stop + 1); }
  async llen(key: string) { return (this.store.get(key) ?? []).length; }
  async lrem() { return 0; }
  async hset(key: string, field: string, value: any) { const h = this.store.get(key) ?? {}; h[field] = value; this.store.set(key, h); return 1; }
  async hget(key: string, field: string) { return (this.store.get(key) ?? {})[field] ?? null; }
  async hgetall(key: string) { return this.store.get(key) ?? null; }
  async hdel(key: string, ...fields: string[]) { const h = this.store.get(key) ?? {}; fields.forEach(f => delete h[f]); return fields.length; }
  async hmset(key: string, obj: Record<string, any>) { this.store.set(key, { ...(this.store.get(key) ?? {}), ...obj }); return 'OK'; }
  async zadd() { return 0; }
  async zrange() { return []; }
  async zrangebyscore() { return []; }
  async zrangebylex() { return []; }
  async zrem() { return 0; }
  async zcard() { return 0; }
  async zscore() { return null; }
  async zcount() { return 0; }
  async zrangebyscoreBuffer() { return []; }
  async keys(pattern: string) { return [...this.store.keys()].filter(k => k.includes(pattern.replace('*', ''))); }
  async smembers() { return []; }
  async sadd() { return 0; }
  async srem() { return 0; }
  async sismember() { return 0; }
  async scard() { return 0; }
  async multi() { return new MultiMock(this); }
  pipeline() { return new MultiMock(this); }
  async exec() { return []; }
  async flushdb() { this.store.clear(); return 'OK'; }
  async ping() { return 'PONG'; }
  async quit() { return 'OK'; }
  async disconnect() { return; }
  async subscribe() { return; }
  async unsubscribe() { return; }
  async publish() { return 0; }
  async psubscribe() { return; }
  async punsubscribe() { return; }
  on() { return this; }
  once() { return this; }
  off() { return this; }
  removeAllListeners() { return this; }
  emit() { return true; }
  duplicate() { return new RedisMock(); }
  defineCommand() { return this; }
  // BullMQ-specific
  async xadd() { return null; }
  async xread() { return null; }
  async xlen() { return 0; }
  async xrange() { return []; }
  async xrevrange() { return []; }
  async xack() { return 0; }
  async xdel() { return 0; }
  async xgroup() { return 'OK'; }
  async xreadgroup() { return null; }
  async xclaim() { return []; }
  async xpending() { return []; }
  async xtrim() { return 0; }
  async xinfo() { return []; }
  async lmpop() { return null; }
  async lpos() { return null; }
  async srandmember() { return null; }
  async spop() { return null; }
  async getBuffer() { return null; }
  async setBuffer() { return 'OK'; }
  async copy() { return 0; }
  async object() { return null; }
  async wait() { return 0; }
}

class MultiMock {
  private commands: Array<() => Promise<any>> = [];
  constructor(private redis: RedisMock) {}
  hset(...args: any[]) { this.commands.push(() => this.redis.hset(args[0], args[1], args[2])); return this; }
  hdel(...args: any[]) { this.commands.push(() => this.redis.hdel(args[0], ...args.slice(1))); return this; }
  set(...args: any[]) { this.commands.push(() => this.redis.set(args[0], args[1])); return this; }
  del(...args: any[]) { this.commands.push(() => this.redis.del(...args)); return this; }
  zadd(...args: any[]) { this.commands.push(() => this.redis.zadd()); return this; }
  zrem(...args: any[]) { this.commands.push(() => this.redis.zrem()); return this; }
  lpush(...args: any[]) { this.commands.push(() => this.redis.lpush(args[0], ...args.slice(1))); return this; }
  rpush(...args: any[]) { this.commands.push(() => this.redis.rpush(args[0], ...args.slice(1))); return this; }
  lrem(...args: any[]) { this.commands.push(() => this.redis.lrem()); return this; }
  expire(...args: any[]) { this.commands.push(() => this.redis.expire()); return this; }
  xadd(...args: any[]) { this.commands.push(async () => null); return this; }
  xdel(...args: any[]) { this.commands.push(async () => 0); return this; }
  xack(...args: any[]) { this.commands.push(async () => 0); return this; }
  async exec() { return Promise.all(this.commands.map(fn => fn().then(v => [null, v]))); }
}
