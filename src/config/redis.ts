// src/config/redis.ts

import { createClient } from 'redis';
import { config } from './index';
import { logger } from '../utils/logger';

// Create Redis client
const redisClient = createClient({
  url: config.redis.url,
});

// Error handling
redisClient.on('error', (err) => {
  logger.error('Redis Client Error:', err);
});

redisClient.on('connect', () => {
  logger.info('✅ Redis connected successfully');
});

redisClient.on('disconnect', () => {
  logger.warn('Redis disconnected');
});

// Connect function
export async function connectRedis() {
  try {
    await redisClient.connect();
  } catch (error) {
    logger.error('❌ Redis connection failed:', error);
    throw error;
  }
}

// Disconnect function
export async function disconnectRedis() {
  await redisClient.quit();
  logger.info('Redis disconnected');
}

// Cache helper functions
export const cache = {
  /**
   * Set a value in cache
   */
  async set(key: string, value: any, expiresIn?: number): Promise<void> {
    const serialized = JSON.stringify(value);
    if (expiresIn) {
      await redisClient.setEx(key, expiresIn, serialized);
    } else {
      await redisClient.set(key, serialized);
    }
  },

  /**
   * Get a value from cache
   */
  async get<T>(key: string): Promise<T | null> {
    const value = await redisClient.get(key);
    if (!value) return null;
    return JSON.parse(value) as T;
  },

  /**
   * Delete a key from cache
   */
  async del(key: string): Promise<void> {
    await redisClient.del(key);
  },

  /**
   * Check if key exists
   */
  async exists(key: string): Promise<boolean> {
    const result = await redisClient.exists(key);
    return result === 1;
  },

  /**
   * Set expiration for a key
   */
  async expire(key: string, seconds: number): Promise<void> {
    await redisClient.expire(key, seconds);
  },

  /**
   * Increment a value
   */
  async incr(key: string): Promise<number> {
    return await redisClient.incr(key);
  },

  /**
   * Decrement a value
   */
  async decr(key: string): Promise<number> {
    return await redisClient.decr(key);
  },

  /**
   * Get keys matching pattern
   */
  async keys(pattern: string): Promise<string[]> {
    return await redisClient.keys(pattern);
  },

  /**
   * Delete all keys matching pattern
   */
  async delPattern(pattern: string): Promise<void> {
    const keys = await redisClient.keys(pattern);
    if (keys.length > 0) {
      await redisClient.del(keys);
    }
  },

  /**
   * Add to set
   */
  async sadd(key: string, ...members: string[]): Promise<number> {
    return await redisClient.sAdd(key, members);
  },

  /**
   * Get set members
   */
  async smembers(key: string): Promise<string[]> {
    return await redisClient.sMembers(key);
  },

  /**
   * Check if member in set
   */
  async sismember(key: string, member: string): Promise<boolean> {
    return await redisClient.sIsMember(key, member);
  },
};

// Handle graceful shutdown
process.on('SIGINT', async () => {
  await disconnectRedis();
});

process.on('SIGTERM', async () => {
  await disconnectRedis();
});

export { redisClient };
export default redisClient;
