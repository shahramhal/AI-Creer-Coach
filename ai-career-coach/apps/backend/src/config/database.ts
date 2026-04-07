// apps/backend/src/config/database.ts
import { PrismaClient } from '@prisma/client';
import { logger } from '../utils/logger.js';
import mongoose from 'mongoose';
import Redis from 'ioredis';


// PRISMA (PostgreSQL) CLIENT


/**
 * Singleton Prisma client instance
 * Handles PostgreSQL connections with connection pooling
 */
export const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' 
    ? ['query', 'error', 'warn'] 
    : ['error'],
  errorFormat: 'pretty',
});

// Handle Prisma connection
prisma.$connect()
  .then(() => {
    logger.info(' PostgreSQL connected via Prisma');
  })
  .catch((error) => {
    logger.error(error);
    process.exit(1);
  });


// MONGOOSE (MongoDB) CONNECTION


/**
 * Connect to MongoDB
 * Handles connection with automatic retry
 */
export const connectMongoDB = async (): Promise<void> => {
  try {
    const mongoUrl = process.env.MONGODB_URL;
    if (!mongoUrl) {
    throw new Error('MONGODB_URL environment variable is not set');
    }
    await mongoose.connect(mongoUrl, {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
    });

    logger.info(' MongoDB connected');

    // Handle connection events
    mongoose.connection.on('error', (err) => {
      logger.error(err);
    });

    mongoose.connection.on('disconnected', () => {
      logger.info('MongoDB disconnected');
    });

  } catch (error) {
    logger.error(error);
    process.exit(1);
  }
};


// REDIS CLIENTS


/**
 * Main Redis client for caching
 */
export const redis = new Redis({
  host: process.env.REDIS_HOST || 'redis',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  ...(process.env.REDIS_PASSWORD && { password: process.env.REDIS_PASSWORD }),
  db: 0,
  retryStrategy: (times: number) => {
    const delay = Math.min(times * 50, 2000);
    return delay;
  },
  maxRetriesPerRequest: 3,
  enableReadyCheck: true,
  lazyConnect: false,
});

/**
 * Session Redis client (separate database)
 */
export const sessionRedis = new Redis({
  host: process.env.REDIS_HOST || 'redis',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  ...(process.env.REDIS_PASSWORD && { password: process.env.REDIS_PASSWORD }),
  db: 1,
  keyPrefix: 'session:',
});

// Redis event handlers
redis.on('connect', () => {
  logger.info(' Redis connected');
});

redis.on('error', (err) => {
  logger.error(err);
});


// CACHE MANAGER


/**
 * Cache manager for Redis operations
 * Provides simple get/set/del interface with automatic JSON serialization
 */
class CacheManager {
  private redis: Redis;
  private defaultTTL: number;

  constructor(redisClient: Redis) {
    this.redis = redisClient;
    this.defaultTTL = 3600; // 1 hour
  }

  /**
   * Get cached value
   * @param key - Cache key
   * @returns Parsed JSON value or null
   */
  async get<T = any>(key: string): Promise<T | null> {
    try {
      const value = await this.redis.get(key);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      logger.error(error);
      return null;
    }
  }

  async set(key: string, value: unknown, ttl: number = this.defaultTTL): Promise<void> {
    try {
      await this.redis.setex(key, ttl, JSON.stringify(value));
    } catch (error) {
      logger.error(error);
    }
  }

  async del(key: string): Promise<void> {
    try {
      await this.redis.del(key);
    } catch (error) {
      logger.error(error);
    }
  }

  /**
   * Get or set cache value (cache-aside pattern)
   * @param key - Cache key
   * @param fetchFn - Function to fetch value if not cached
   * @param ttl - Time to live in seconds
   * @returns Cached or fetched value
   */
  async getOrSet<T = any>(
    key: string, 
    fetchFn: () => Promise<T>, 
    ttl: number = this.defaultTTL
  ): Promise<T | null> {
    let value = await this.get<T>(key);
    
    if (!value) {
      value = await fetchFn();
      if (value !== null && value !== undefined) {
        await this.set(key, value, ttl);
      }
    }
    
    return value;
  }

  /**
   * Delete all cache entries matching a pattern
   * @param pattern - Redis key pattern (e.g. "match:user:123:*")
   * @returns Number of keys deleted
   */
  async delByPattern(pattern: string): Promise<number> {
    try {
      let cursor = '0';
      let total = 0;
      do {
        const [nextCursor, keys] = await this.redis.scan(cursor, 'MATCH', pattern, 'COUNT', 100);
        cursor = nextCursor;
        if (keys.length > 0) {
          await this.redis.del(...keys);
          total += keys.length;
        }
      } while (cursor !== '0');
      return total;
    } catch (error) {
      logger.error(error);
      return 0;
    }
  }

  /**
   * Invalidate all cache entries for a user
   * @param userId - User ID
   */
  async invalidateUser(userId: string): Promise<void> {
    const patterns = [
      `user:*:${userId}`,
      `match:user:${userId}:*`,
      `cvs:user:${userId}`,
    ];

    for (const pattern of patterns) {
      await this.delByPattern(pattern);
    }
  }
}

/**
 * Cache manager instance
 */
export const cache = new CacheManager(redis);


// DATABASE HEALTH CHECK


export interface HealthStatus {
  postgres: boolean;
  mongodb: boolean;
  redis: boolean;
  timestamp: string;
}

/**
 * Check all database connections
 * @returns Health status object
 */
export async function checkDatabaseHealth(): Promise<HealthStatus> {
  const health: HealthStatus = {
    postgres: false,
    mongodb: false,
    redis: false,
    timestamp: new Date().toISOString(),
  };

  // Check PostgreSQL
  try {
    await prisma.$queryRaw`SELECT 1`;
    health.postgres = true;
  } catch (error) {
    logger.error(error);
  }

  // Check MongoDB
  try {
    if (mongoose.connection.readyState === 1 && mongoose.connection.db) {
      await mongoose.connection.db.admin().ping();
      health.mongodb = true;
    }
  } catch (error) {
    logger.error(error);
  }

  // Check Redis
  try {
    await redis.ping();
    health.redis = true;
  } catch (error) {
    logger.error(error);
  }

  return health;
}


// GRACEFUL SHUTDOWN


/**
 * Close all database connections gracefully
 */
export async function closeDatabaseConnections(): Promise<void> {
  logger.info('Closing database connections...');

  try {
    // Close Prisma
    await prisma.$disconnect();
    logger.info('PostgreSQL disconnected');

    // Close MongoDB
    await mongoose.connection.close();
    logger.info('MongoDB disconnected');

    // Close Redis
    redis.disconnect();
    sessionRedis.disconnect();
    logger.info('Redis disconnected');

  } catch (error) {
    logger.error(error);
    process.exit(1);
  }
}

// Handle SIGINT for development (Ctrl+C)
process.on('SIGINT', async () => {
  await closeDatabaseConnections();
  process.exit(0);
});