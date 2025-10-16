// Redis Configuration for AI Career Coach
// Purpose: Caching, session management, job queues, and real-time features

const Redis = require('ioredis');
const Bull = require('bull');

// =====================================================
// REDIS CLIENT CONFIGURATION
// =====================================================

// Main Redis client for caching
const redis = new Redis({
    host: process.env.REDIS_HOST || 'localhost',
    port: process.env.REDIS_PORT || 6379,
    password: process.env.REDIS_PASSWORD,
    db: 0,  // Main database
    retryStrategy: (times) => {
        const delay = Math.min(times * 50, 2000);
        return delay;
    },
    maxRetriesPerRequest: 3
});

// Separate client for sessions
const sessionRedis = new Redis({
    host: process.env.REDIS_HOST || 'localhost',
    port: process.env.REDIS_PORT || 6379,
    password: process.env.REDIS_PASSWORD,
    db: 1,  // Separate DB for sessions
    keyPrefix: 'session:'
});

// Separate client for pub/sub
const pubClient = new Redis({
    host: process.env.REDIS_HOST || 'localhost',
    port: process.env.REDIS_PORT || 6379,
    password: process.env.REDIS_PASSWORD,
    db: 2
});

const subClient = pubClient.duplicate();

// =====================================================
// CACHE KEY PATTERNS
// =====================================================

const cacheKeys = {
    // User-related caching
    userProfile: (userId) => `user:profile:${userId}`,
    userSkills: (userId) => `user:skills:${userId}`,
    userApplications: (userId) => `user:applications:${userId}`,
    userCareerScore: (userId) => `user:career_score:${userId}`,
    
    // Job-related caching
    jobDetails: (jobId) => `job:details:${jobId}`,
    jobEmbedding: (jobId) => `job:embedding:${jobId}`,
    jobSearchResults: (query, filters) => `job:search:${JSON.stringify({query, filters})}`,
    trendingJobs: (location) => `job:trending:${location || 'global'}`,
    
    // CV/Resume caching
    parsedCV: (cvId) => `cv:parsed:${cvId}`,
    cvAnalysis: (cvId) => `cv:analysis:${cvId}`,
    atsScore: (cvId) => `cv:ats_score:${cvId}`,
    
    // Matching results
    userMatches: (userId, page = 1) => `match:user:${userId}:page:${page}`,
    matchScore: (userId, jobId) => `match:score:${userId}:${jobId}`,
    
    // Salary data
    salaryPrediction: (title, location, experience) => 
        `salary:prediction:${title}:${location}:${experience}`,
    salaryStats: (title, location) => `salary:stats:${title}:${location}`,
    
    // Analytics
    dailyStats: (date) => `analytics:daily:${date}`,
    userMetrics: (userId, date) => `analytics:user:${userId}:${date}`,
    
    // API rate limiting
    rateLimit: (userId, endpoint) => `rate_limit:${userId}:${endpoint}`,
    
    // Temporary data
    uploadProgress: (uploadId) => `upload:progress:${uploadId}`,
    verificationToken: (token) => `verify:token:${token}`,
    resetToken: (token) => `reset:token:${token}`
};

// =====================================================
// CACHE UTILITIES
// =====================================================

class CacheManager {
    constructor(redisClient) {
        this.redis = redisClient;
        this.defaultTTL = 3600; // 1 hour default
    }
    
    // Get cached data with automatic JSON parsing
    async get(key) {
        try {
            const data = await this.redis.get(key);
            return data ? JSON.parse(data) : null;
        } catch (error) {
            console.error(`Cache get error for key ${key}:`, error);
            return null;
        }
    }
    
    // Set cache with automatic JSON stringification
    async set(key, value, ttl = this.defaultTTL) {
        try {
            await this.redis.setex(key, ttl, JSON.stringify(value));
            return true;
        } catch (error) {
            console.error(`Cache set error for key ${key}:`, error);
            return false;
        }
    }
    
    // Delete cache entry
    async del(key) {
        try {
            await this.redis.del(key);
            return true;
        } catch (error) {
            console.error(`Cache delete error for key ${key}:`, error);
            return false;
        }
    }
    
    // Delete multiple keys by pattern
    async delPattern(pattern) {
        try {
            const keys = await this.redis.keys(pattern);
            if (keys.length > 0) {
                await this.redis.del(...keys);
            }
            return keys.length;
        } catch (error) {
            console.error(`Cache delete pattern error for ${pattern}:`, error);
            return 0;
        }
    }
    
    // Cache with automatic refresh
    async getOrSet(key, fetchFunction, ttl = this.defaultTTL) {
        try {
            // Try to get from cache
            let data = await this.get(key);
            
            if (!data) {
                // Fetch fresh data
                data = await fetchFunction();
                
                // Cache the result
                if (data) {
                    await this.set(key, data, ttl);
                }
            }
            
            return data;
        } catch (error) {
            console.error(`Cache getOrSet error for key ${key}:`, error);
            return null;
        }
    }
    
    // Invalidate related caches
    async invalidateUser(userId) {
        const patterns = [
            `user:*:${userId}`,
            `match:user:${userId}:*`,
            `analytics:user:${userId}:*`
        ];
        
        for (const pattern of patterns) {
            await this.delPattern(pattern);
        }
    }
}

// Create cache manager instance
const cache = new CacheManager(redis);

// =====================================================
// SESSION MANAGEMENT
// =====================================================

class SessionManager {
    constructor(redisClient) {
        this.redis = redisClient;
        this.sessionTTL = 86400 * 7; // 7 days
    }
    
    // Create new session
    async createSession(userId, sessionData) {
        const sessionId = this.generateSessionId();
        const data = {
            userId,
            ...sessionData,
            createdAt: new Date().toISOString()
        };
        
        await this.redis.setex(
            sessionId,
            this.sessionTTL,
            JSON.stringify(data)
        );
        
        // Track active sessions per user
        await this.redis.sadd(`user_sessions:${userId}`, sessionId);
        
        return sessionId;
    }
    
    // Get session data
    async getSession(sessionId) {
        const data = await this.redis.get(sessionId);
        return data ? JSON.parse(data) : null;
    }
    
    // Extend session TTL
    async touchSession(sessionId) {
        return await this.redis.expire(sessionId, this.sessionTTL);
    }
    
    // Delete session
    async deleteSession(sessionId) {
        const session = await this.getSession(sessionId);
        if (session) {
            await this.redis.srem(`user_sessions:${session.userId}`, sessionId);
        }
        return await this.redis.del(sessionId);
    }
    
    // Delete all user sessions (logout from all devices)
    async deleteAllUserSessions(userId) {
        const sessions = await this.redis.smembers(`user_sessions:${userId}`);
        if (sessions.length > 0) {
            await this.redis.del(...sessions);
        }
        await this.redis.del(`user_sessions:${userId}`);
    }
    
    // Generate unique session ID
    generateSessionId() {
        return `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
}

// Create session manager instance
const sessionManager = new SessionManager(sessionRedis);

// =====================================================
// JOB QUEUE CONFIGURATION (Bull)
// =====================================================

// CV parsing queue
const cvParsingQueue = new Bull('cv-parsing', {
    redis: {
        host: process.env.REDIS_HOST || 'localhost',
        port: process.env.REDIS_PORT || 6379,
        password: process.env.REDIS_PASSWORD,
        db: 3  // Separate DB for queues
    },
    defaultJobOptions: {
        removeOnComplete: 100,  // Keep last 100 completed jobs
        removeOnFail: 50,        // Keep last 50 failed jobs
        attempts: 3,
        backoff: {
            type: 'exponential',
            delay: 2000
        }
    }
});

// Job scraping queue
const scrapingQueue = new Bull('job-scraping', {
    redis: {
        host: process.env.REDIS_HOST || 'localhost',
        port: process.env.REDIS_PORT || 6379,
        password: process.env.REDIS_PASSWORD,
        db: 3
    },
    defaultJobOptions: {
        removeOnComplete: 50,
        removeOnFail: 25,
        attempts: 5,
        backoff: {
            type: 'exponential',
            delay: 5000
        }
    }
});

// Job matching queue
const matchingQueue = new Bull('job-matching', {
    redis: {
        host: process.env.REDIS_HOST || 'localhost',
        port: process.env.REDIS_PORT || 6379,
        password: process.env.REDIS_PASSWORD,
        db: 3
    },
    defaultJobOptions: {
        removeOnComplete: 100,
        removeOnFail: 50,
        attempts: 3,
        backoff: {
            type: 'fixed',
            delay: 3000
        }
    }
});

// Email notification queue
const emailQueue = new Bull('email-notifications', {
    redis: {
        host: process.env.REDIS_HOST || 'localhost',
        port: process.env.REDIS_PORT || 6379,
        password: process.env.REDIS_PASSWORD,
        db: 3
    },
    defaultJobOptions: {
        removeOnComplete: true,
        removeOnFail: false,  // Keep failed emails for debugging
        attempts: 3,
        backoff: {
            type: 'exponential',
            delay: 10000
        }
    }
});

// =====================================================
// RATE LIMITING
// =====================================================

class RateLimiter {
    constructor(redisClient) {
        this.redis = redisClient;
    }
    
    // Check if request is allowed
    async checkLimit(key, maxRequests = 100, windowSeconds = 60) {
        const current = await this.redis.incr(key);
        
        if (current === 1) {
            // First request, set expiry
            await this.redis.expire(key, windowSeconds);
        }
        
        if (current > maxRequests) {
            const ttl = await this.redis.ttl(key);
            return {
                allowed: false,
                remaining: 0,
                resetIn: ttl
            };
        }
        
        return {
            allowed: true,
            remaining: maxRequests - current,
            resetIn: await this.redis.ttl(key)
        };
    }
}

const rateLimiter = new RateLimiter(redis);

// =====================================================
// REAL-TIME FEATURES (Pub/Sub)
// =====================================================

class RealtimeManager {
    constructor(publisher, subscriber) {
        this.pub = publisher;
        this.sub = subscriber;
        this.handlers = new Map();
    }
    
    // Subscribe to channel
    subscribe(channel, handler) {
        this.handlers.set(channel, handler);
        this.sub.subscribe(channel);
    }
    
    // Publish message
    async publish(channel, message) {
        return await this.pub.publish(channel, JSON.stringify(message));
    }
    
    // Initialize listener
    init() {
        this.sub.on('message', (channel, message) => {
            const handler = this.handlers.get(channel);
            if (handler) {
                try {
                    handler(JSON.parse(message));
                } catch (error) {
                    console.error(`Error handling message on ${channel}:`, error);
                }
            }
        });
    }
}

const realtime = new RealtimeManager(pubClient, subClient);

// =====================================================
// VECTOR STORAGE FOR EMBEDDINGS
// =====================================================

class VectorStore {
    constructor(redisClient) {
        this.redis = redisClient;
    }
    
    // Store embedding with metadata
    async storeEmbedding(key, vector, metadata = {}) {
        const data = {
            vector: Array.from(vector),
            metadata,
            timestamp: Date.now()
        };
        
        return await this.redis.setex(
            `embedding:${key}`,
            86400 * 30,  // 30 days TTL
            JSON.stringify(data)
        );
    }
    
    // Retrieve embedding
    async getEmbedding(key) {
        const data = await this.redis.get(`embedding:${key}`);
        return data ? JSON.parse(data) : null;
    }
    
    // Batch retrieve embeddings
    async getEmbeddings(keys) {
        const pipeline = this.redis.pipeline();
        keys.forEach(key => pipeline.get(`embedding:${key}`));
        
        const results = await pipeline.exec();
        return results.map(([err, data]) => {
            if (err || !data) return null;
            return JSON.parse(data);
        });
    }
}

const vectorStore = new VectorStore(redis);

// =====================================================
// EXPORT ALL COMPONENTS
// =====================================================

module.exports = {
    // Redis clients
    redis,
    sessionRedis,
    pubClient,
    subClient,
    
    // Cache management
    cache,
    cacheKeys,
    
    // Session management
    sessionManager,
    
    // Job queues
    cvParsingQueue,
    scrapingQueue,
    matchingQueue,
    emailQueue,
    
    // Rate limiting
    rateLimiter,
    
    // Real-time features
    realtime,
    
    // Vector storage
    vectorStore
};