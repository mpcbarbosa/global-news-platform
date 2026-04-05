import Redis from 'ioredis';
import { env } from './env';
import { logger } from './logger';

let redis: Redis;

export function getRedis(): Redis {
  if (!redis) {
    redis = new Redis(env.REDIS_URL, {
      maxRetriesPerRequest: 3,
      retryStrategy(times) {
        const delay = Math.min(times * 200, 5000);
        return delay;
      },
      lazyConnect: true,
    });

    redis.on('connect', () => {
      logger.info('✅ Redis connection established');
    });

    redis.on('error', (err) => {
      logger.error('Redis connection error', { error: err.message });
    });

    redis.on('close', () => {
      logger.warn('Redis connection closed');
    });
  }
  return redis;
}

export async function connectRedis(): Promise<void> {
  const client = getRedis();
  try {
    await client.connect();
  } catch (error) {
    // ioredis may already be connecting
    if ((error as Error).message?.includes('already connecting')) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
    } else {
      throw error;
    }
  }
}

export async function cacheGet<T>(key: string): Promise<T | null> {
  const client = getRedis();
  const data = await client.get(key);
  if (!data) return null;
  try {
    return JSON.parse(data) as T;
  } catch {
    return data as unknown as T;
  }
}

export async function cacheSet(key: string, value: unknown, ttlSeconds = 300): Promise<void> {
  const client = getRedis();
  const serialized = typeof value === 'string' ? value : JSON.stringify(value);
  await client.set(key, serialized, 'EX', ttlSeconds);
}

export async function cacheDelete(pattern: string): Promise<void> {
  const client = getRedis();
  const keys = await client.keys(pattern);
  if (keys.length > 0) {
    await client.del(...keys);
  }
}

export async function testRedisConnection(): Promise<boolean> {
  try {
    const client = getRedis();
    await client.ping();
    logger.info('✅ Redis connection successful');
    return true;
  } catch (error) {
    logger.error('❌ Redis connection failed', { error });
    return false;
  }
}
