import Redis from 'ioredis';

let redisClient;

export const connectRedis = () => {
  redisClient = new Redis(process.env.REDIS_URI || 'redis://localhost:6379', {
    retryStrategy(times) {
      if (times > 3) {
        console.warn('⚠️  Redis is unreachable. Caching layer is bypassed.');
        return null; // Stops retrying
      }
      return Math.min(times * 50, 2000);
    },
    maxRetriesPerRequest: null
  });
  
  redisClient.on('connect', () => {
    console.log('Redis connected successfully');
  });

  redisClient.on('error', (err) => {
    // Only log error if we are still attempting to connect
    if (err.code !== 'ECONNREFUSED') {
      console.error('Redis connection error:', err.message);
    }
  });
};

export const getRedisClient = () => redisClient;
