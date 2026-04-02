// apps/backend/src/test-setup.ts
// Global test setup: mock all external dependencies before any test runs

import { vi } from 'vitest';

//  Environment Variables 
// Set required env vars before modules load
process.env.JWT_SECRET = 'test-jwt-secret-at-least-32-chars-long';
process.env.JWT_REFRESH_SECRET = 'test-jwt-refresh-secret-at-least-32-chars-long';
process.env.JWT_EXPIRES_IN = '1h';
process.env.JWT_REFRESH_EXPIRES_IN = '7d';
process.env.NODE_ENV = 'test';
process.env.FRONTEND_URL = 'http://localhost:3000';
process.env.ML_SERVICE_URL = 'http://localhost:8000';
process.env.JOB_API_SERVICE_URL = 'http://localhost:8001';
process.env.EMAIL_HOST = 'smtp.test.com';
process.env.EMAIL_PORT = '587';
process.env.EMAIL_USER = 'test@test.com';
process.env.EMAIL_PASSWORD = 'test-password';
process.env.EMAIL_FROM = 'noreply@test.com';
process.env.ADZUNA_APP_ID = 'test-adzuna-id';
process.env.ADZUNA_APP_KEY = 'test-adzuna-key';
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test';
process.env.MONGODB_URL = 'mongodb://localhost:27017/test';
process.env.REDIS_HOST = 'localhost';
process.env.REDIS_PORT = '6379';

// Mock ioredis 
vi.mock('ioredis', () => {
  const mockRedisInstance = {
    get: vi.fn().mockResolvedValue(null),
    set: vi.fn().mockResolvedValue('OK'),
    setex: vi.fn().mockResolvedValue('OK'),
    del: vi.fn().mockResolvedValue(1),
    keys: vi.fn().mockResolvedValue([]),
    ping: vi.fn().mockResolvedValue('PONG'),
    disconnect: vi.fn(),
    on: vi.fn().mockReturnThis(),
    quit: vi.fn().mockResolvedValue('OK'),
    status: 'ready',
  };

  const RedisMock = vi.fn().mockImplementation(() => mockRedisInstance);
  return { default: RedisMock };
});

//  Mock Bull queues 
vi.mock('bull', () => {
  const BullMock = vi.fn().mockImplementation(() => ({
    add: vi.fn().mockResolvedValue({ id: 'mock-job-id' }),
    process: vi.fn(),
    on: vi.fn().mockReturnThis(),
    close: vi.fn().mockResolvedValue(undefined),
    getJob: vi.fn().mockResolvedValue(null),
    getJobs: vi.fn().mockResolvedValue([]),
    clean: vi.fn().mockResolvedValue([]),
  }));
  return { default: BullMock };
});

//  Mock @prisma/client 
// We use a singleton pattern: every call to `new PrismaClient()` returns the same
// mock instance, so source modules and test files share the same mock object.
vi.mock('@prisma/client', () => {
  // Singleton mock instance shared across all `new PrismaClient()` calls
  const sharedMockPrismaInstance = {
    user: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
      delete: vi.fn(),
      count: vi.fn(),
    },
    userProfile: {
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      upsert: vi.fn(),
    },
    cV: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
      delete: vi.fn(),
    },
    $connect: vi.fn().mockResolvedValue(undefined),
    $disconnect: vi.fn().mockResolvedValue(undefined),
    $queryRaw: vi.fn().mockResolvedValue([{ 1: 1 }]),
  };

  // Constructor function (not arrow function) so `new PrismaClient()` works
  function PrismaClientMock(this: any) {
    return sharedMockPrismaInstance;
  }

  return { PrismaClient: PrismaClientMock };
});

//  Mock mongoose 
vi.mock('mongoose', async () => {
  const mockCollection = {
    findOne: vi.fn().mockResolvedValue(null),
    find: vi.fn().mockReturnValue({
      sort: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      toArray: vi.fn().mockResolvedValue([]),
    }),
    insertOne: vi.fn().mockResolvedValue({ insertedId: { toString: () => 'mongo-doc-id-123' } }),
    updateOne: vi.fn().mockResolvedValue({ modifiedCount: 1 }),
    deleteOne: vi.fn().mockResolvedValue({ deletedCount: 1 }),
    countDocuments: vi.fn().mockResolvedValue(0),
  };

  const mockDb = {
    collection: vi.fn().mockReturnValue(mockCollection),
    admin: vi.fn().mockReturnValue({ ping: vi.fn().mockResolvedValue({ ok: 1 }) }),
  };

  const mockConnection = {
    readyState: 1,
    db: mockDb,
    on: vi.fn(),
    close: vi.fn().mockResolvedValue(undefined),
  };

  const mockMongoose = {
    connect: vi.fn().mockResolvedValue(undefined),
    connection: mockConnection,
    Schema: class MockSchema {
      constructor(definition: any, options?: any) {}
      index() { return this; }
    },
    model: vi.fn().mockReturnValue({
      find: vi.fn().mockReturnValue({ sort: vi.fn().mockReturnThis(), limit: vi.fn().mockReturnThis(), toArray: vi.fn().mockResolvedValue([]) }),
      findOne: vi.fn().mockResolvedValue(null),
      create: vi.fn().mockResolvedValue({}),
      updateOne: vi.fn().mockResolvedValue({}),
      deleteOne: vi.fn().mockResolvedValue({}),
    }),
    Types: {
      ObjectId: class MockObjectId {
        constructor(id?: string) {}
        toString() { return 'mock-object-id'; }
      },
    },
    mongo: {
      Db: class MockMongoDb {},
    },
  };

  return { default: mockMongoose, ...mockMongoose };
});

//  Mock nodemailer 
vi.mock('nodemailer', () => {
  const sendMailMock = vi.fn().mockResolvedValue({ messageId: 'mock-message-id' });
  const createTransportMock = vi.fn().mockReturnValue({ sendMail: sendMailMock });
  return {
    default: {
      createTransport: createTransportMock,
    },
  };
});
