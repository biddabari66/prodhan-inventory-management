import Redis from 'ioredis';
import { env } from './env';

// Redis is optional. When REDIS_URL is not configured (e.g. local dev),
// `redis` is null and callers should guard against it.
export const redis = env.REDIS_URL
  ? new Redis(env.REDIS_URL, {
      maxRetriesPerRequest: null,
      enableReadyCheck: false,
      lazyConnect: true,
    })
  : null;

if (redis) {
  redis.on('error', (err) => {
    console.error('Redis error:', err);
  });
  redis.on('connect', () => {
    console.log('✅ Redis connected');
  });
}

export default redis;
