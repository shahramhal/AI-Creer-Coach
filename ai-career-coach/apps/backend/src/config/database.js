// database.config.js
// Place this in: ai-career-coach/apps/backend/src/config/database.js

const { PrismaClient } = require('@prisma/client');
const mongoose = require('mongoose');
const Redis = require('ioredis');
const Bull = require('bull');

// =====================================================
// PRISMA (PostgreSQL) CLIENT
// =====================================================

// Create singleton Prisma client
const prisma = new PrismaClient({
    log: process.env.NODE_ENV === 'development' 
        ? ['query', 'error', 'warn'] 
        : ['error'],
    errorFormat: 'pretty',
});

// Handle Prisma connection errors
prisma.$connect()
    .then(() => {
        console.log('✅ PostgreSQL connected via Prisma');
    })
    .catch((error) => {
        console.error('❌ PostgreSQL connection failed:', error);
        process.exit(1);
    });

// =====================================================
// MONGOOSE (MongoDB) CONNECTION
// =====================================================

const connectMongoDB = async () => {
    try {
        const options = {
            useNewUrlParser: true,
            useUnifiedTopology: true,
            maxPoolSize: 10,
            serverSelectionTimeoutMS: 5000,
        };

        await mongoose.connect(
            process.env.MONGODB_URI || 'mongodb://localhost:27017/career_coach_db',
            options
        );

        console.log('✅ MongoDB connected');

        // Handle connection events
        mongoose.connection.on('error', (err) => {
            console.error('MongoDB connection error:', err);
        });

        mongoose.connection.on('disconnected', () => {
            console.log('MongoDB disconnected');
        });

    } catch (error) {
        console.error('❌ MongoDB connection failed:', error);
        process.exit(1);
    }
};

// =====================================================
// REDIS CLIENTS
// =====================================================

// Main Redis client for caching
const redis = new Redis({
    host: process.env.REDIS_HOST || 'localhost',
    port: process.env.REDIS_PORT || 6379,
    password: process.env.REDIS_PASSWORD,
    db: 0,
    retryStrategy: (times) => {
        const delay = Math.min(times * 50, 2000);
        return delay;
    },
    maxRetriesPerRequest: 3,
    enableReadyCheck: true,
    lazyConnect: false,
});

// Session Redis client
const sessionRedis = new Redis({
    host: process.env.REDIS_HOST || 'localhost',
    port: process.env.REDIS_PORT || 6379,
    password: process.env.REDIS_PASSWORD,
    db: 1,
    keyPrefix: 'session:',
});

// Redis event handlers
redis.on('connect', () => {
    console.log('✅ Redis connected');
});

redis.on('error', (err) => {
    console.error('❌ Redis connection error:', err);
});

// =====================================================
// BULL QUEUES
// =====================================================

// Define queue configurations
const queueConfig = {
    redis: {
        host: process.env.REDIS_HOST || 'localhost',
        port: process.env.REDIS_PORT || 6379,
        password: process.env.REDIS_PASSWORD,
        db: 3,
    },
};

// Initialize queues
const queues = {
    cvParsing: new Bull('cv-parsing', queueConfig),
    jobScraping: new Bull('job-scraping', queueConfig),
    jobMatching: new Bull('job-matching', queueConfig),
    emailNotification: new Bull('email-notifications', queueConfig),
    salaryPrediction: new Bull('salary-prediction', queueConfig),
};

// =====================================================
// CACHE MANAGER
// =====================================================

class CacheManager {
    constructor(redisClient) {
        this.redis = redisClient;
        this.defaultTTL = 3600; // 1 hour
    }

    /**
     * Get cached value
     * @param {string} key - Cache key
     * @returns {Promise<any>} Parsed JSON value or null
     */
    async get(key) {
        try {
            const value = await this.redis.get(key);
            return value ? JSON.parse(value) : null;
        } catch (error) {
            console.error(`Cache get error for ${key}:`, error);
            return null;
        }
    }

    /**
     * Set cache value
     * @param {string} key - Cache key
     * @param {any} value - Value to cache
     * @param {number} ttl - Time to live in seconds
     * @returns {Promise<boolean>} Success status
     */
    async set(key, value, ttl = this.defaultTTL) {
        try {
            await this.redis.setex(key, ttl, JSON.stringify(value));
            return true;
        } catch (error) {
            console.error(`Cache set error for ${key}:`, error);
            return false;
        }
    }

    /**
     * Delete cache entry
     * @param {string} key - Cache key
     * @returns {Promise<boolean>} Success status
     */
    async del(key) {
        try {
            await this.redis.del(key);
            return true;
        } catch (error) {
            console.error(`Cache delete error for ${key}:`, error);
            return false;
        }
    }

    /**
     * Get or set cache value
     * @param {string} key - Cache key
     * @param {Function} fetchFn - Function to fetch value if not cached
     * @param {number} ttl - Time to live in seconds
     * @returns {Promise<any>} Cached or fetched value
     */
    async getOrSet(key, fetchFn, ttl = this.defaultTTL) {
        let value = await this.get(key);
        
        if (!value) {
            value = await fetchFn();
            if (value !== null && value !== undefined) {
                await this.set(key, value, ttl);
            }
        }
        
        return value;
    }

    /**
     * Invalidate all cache entries for a user
     * @param {string} userId - User ID
     * @returns {Promise<void>}
     */
    async invalidateUser(userId) {
        const patterns = [
            `user:*:${userId}`,
            `match:user:${userId}:*`,
            `cv:*:${userId}`,
        ];

        for (const pattern of patterns) {
            const keys = await this.redis.keys(pattern);
            if (keys.length > 0) {
                await this.redis.del(...keys);
            }
        }
    }
}

// Create cache manager instance
const cache = new CacheManager(redis);

// =====================================================
// DATABASE HEALTH CHECK
// =====================================================

/**
 * Check all database connections
 * @returns {Promise<object>} Health status
 */
async function checkDatabaseHealth() {
    const health = {
        postgres: false,
        mongodb: false,
        redis: false,
        timestamp: new Date().toISOString(),
    };

    try {
        // Check PostgreSQL
        await prisma.$queryRaw`SELECT 1`;
        health.postgres = true;
    } catch (error) {
        console.error('PostgreSQL health check failed:', error);
    }

    try {
        // Check MongoDB
        if (mongoose.connection.readyState === 1) {
            await mongoose.connection.db.admin().ping();
            health.mongodb = true;
        }
    } catch (error) {
        console.error('MongoDB health check failed:', error);
    }

    try {
        // Check Redis
        await redis.ping();
        health.redis = true;
    } catch (error) {
        console.error('Redis health check failed:', error);
    }

    return health;
}

// =====================================================
// GRACEFUL SHUTDOWN
// =====================================================

/**
 * Close all database connections gracefully
 * @returns {Promise<void>}
 */
async function closeDatabaseConnections() {
    console.log('Closing database connections...');

    try {
        // Close Prisma
        await prisma.$disconnect();
        console.log('PostgreSQL disconnected');

        // Close MongoDB
        await mongoose.connection.close();
        console.log('MongoDB disconnected');

        // Close Redis
        redis.disconnect();
        sessionRedis.disconnect();
        console.log('Redis disconnected');

        // Close Bull queues
        await Promise.all(
            Object.values(queues).map(queue => queue.close())
        );
        console.log('Job queues closed');

    } catch (error) {
        console.error('Error during shutdown:', error);
        process.exit(1);
    }
}

// Handle process termination
process.on('SIGINT', async () => {
    await closeDatabaseConnections();
    process.exit(0);
});

process.on('SIGTERM', async () => {
    await closeDatabaseConnections();
    process.exit(0);
});

// =====================================================
// EXPORTS
// =====================================================

module.exports = {
    // Database clients
    prisma,
    mongoose,
    redis,
    sessionRedis,
    
    // Connection functions
    connectMongoDB,
    checkDatabaseHealth,
    closeDatabaseConnections,
    
    // Cache manager
    cache,
    
    // Job queues
    queues,
};