import { getRedisClient } from '../config/redis.js';

export const cache = (ttlSeconds = 300) => {
  return async (req, res, next) => {
    if (req.method !== 'GET') return next();
    
    const client = getRedisClient();
    if (!client) return next();

    const key = `cache:${req.originalUrl}`;
    
    try {
      const cachedData = await client.get(key);
      if (cachedData) {
        return res.status(200).json(JSON.parse(cachedData));
      }
      
      const originalJson = res.json.bind(res);
      res.json = (body) => {
        if (res.statusCode < 400) {
          client.setex(key, ttlSeconds, JSON.stringify(body));
        }
        originalJson(body);
      };
      
      next();
    } catch (err) {
      console.error('Redis cache error:', err);
      next();
    }
  };
};

export const clearCache = async (pattern) => {
  try {
    const client = getRedisClient();
    if (!client || client.status !== 'ready') return;
    const keys = await client.keys(`cache:${pattern}*`);
    if (keys.length > 0) {
      await client.del(keys);
    }
  } catch (error) {
    console.warn(`Redis clearCache bypassed: ${error.message}`);
  }
};
