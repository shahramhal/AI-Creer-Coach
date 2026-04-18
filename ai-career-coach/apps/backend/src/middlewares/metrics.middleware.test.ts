// apps/backend/src/middlewares/metrics.middleware.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import express from 'express';
import request from 'supertest';

const mockRedis = vi.hoisted(() => ({
  lpush: vi.fn(),
  ltrim: vi.fn(),
  expire: vi.fn(),
}));

vi.mock('../config/database.js', () => ({
  redis: mockRedis,
}));

import { parseMetricKey, apiMetricsMiddleware } from './metrics.middleware.js';

function buildApp(extraRoutes?: (app: express.Application) => void): express.Application {
  const app = express();
  app.use(apiMetricsMiddleware);
  if (extraRoutes) extraRoutes(app);
  return app;
}

// Let the fire-and-forget Redis promise chain complete before asserting.
// Mocked promises resolve synchronously in microtasks, so a single
// event-loop tick is enough.
const flushPromises = () => new Promise<void>((resolve) => setTimeout(resolve, 0));

describe('parseMetricKey', () => {
  it('should extract method and route from a well-formed key', () => {
    const result = parseMetricKey('metrics:api:GET|/api/v1/users');
    expect(result.method).toBe('GET');
    expect(result.route).toBe('/api/v1/users');
  });

  it('should handle routes containing colons (Express param syntax)', () => {
    const result = parseMetricKey('metrics:api:POST|/api/v1/users/:id/cvs');
    expect(result.method).toBe('POST');
    expect(result.route).toBe('/api/v1/users/:id/cvs');
  });

  it('should handle a root route', () => {
    const result = parseMetricKey('metrics:api:DELETE|/');
    expect(result.method).toBe('DELETE');
    expect(result.route).toBe('/');
  });

  it('should correctly split on the first pipe even when the route also has colons', () => {
    const result = parseMetricKey('metrics:api:PATCH|/api/:id');
    expect(result.method).toBe('PATCH');
    expect(result.route).toBe('/api/:id');
  });
});

describe('apiMetricsMiddleware', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRedis.lpush.mockResolvedValue(1);
    mockRedis.ltrim.mockResolvedValue('OK');
    mockRedis.expire.mockResolvedValue(1);
  });

  it('should call lpush, ltrim, and expire for a normal API request', async () => {
    const app = buildApp((a) => {
      a.get('/api/test', (_req, res) => res.json({ ok: true }));
    });

    await request(app).get('/api/test');
    await flushPromises();

    expect(mockRedis.lpush).toHaveBeenCalledTimes(1);
    expect(mockRedis.ltrim).toHaveBeenCalledTimes(1);
    expect(mockRedis.expire).toHaveBeenCalledTimes(1);
  });

  it('should skip recording metrics for OPTIONS requests', async () => {
    const app = buildApp((a) => {
      a.options('/api/test', (_req, res) => res.status(204).send());
    });

    await request(app).options('/api/test');
    await flushPromises();

    expect(mockRedis.lpush).not.toHaveBeenCalled();
  });

  it('should skip recording metrics for the root path', async () => {
    const app = buildApp((a) => {
      a.get('/', (_req, res) => res.json({ ok: true }));
    });

    await request(app).get('/');
    await flushPromises();

    expect(mockRedis.lpush).not.toHaveBeenCalled();
  });

  it('should skip recording metrics for /health', async () => {
    const app = buildApp((a) => {
      a.get('/health', (_req, res) => res.json({ ok: true }));
    });

    await request(app).get('/health');
    await flushPromises();

    expect(mockRedis.lpush).not.toHaveBeenCalled();
  });

  it('should skip recording metrics for /api/docs paths', async () => {
    const app = buildApp((a) => {
      a.get('/api/docs/swagger', (_req, res) => res.json({ ok: true }));
    });

    await request(app).get('/api/docs/swagger');
    await flushPromises();

    expect(mockRedis.lpush).not.toHaveBeenCalled();
  });

  it('should use the matched Express route pattern rather than the raw URL', async () => {
    const app = buildApp((a) => {
      a.get('/api/users/:id', (_req, res) => res.json({ ok: true }));
    });

    await request(app).get('/api/users/42');
    await flushPromises();

    const lpushKey = mockRedis.lpush.mock.calls[0]![0] as string;
    expect(lpushKey).toContain('/api/users/:id');
    expect(lpushKey).not.toContain('/api/users/42');
  });

  it('should normalize UUIDs to :id when no Express route is matched', async () => {
    const uuid = '550e8400-e29b-41d4-a716-446655440000';
    const app = buildApp();

    await request(app).get(`/api/items/${uuid}`);
    await flushPromises();

    const lpushKey = mockRedis.lpush.mock.calls[0]![0] as string;
    expect(lpushKey).toContain(':id');
    expect(lpushKey).not.toContain(uuid);
  });

  it('should normalize numeric segment IDs to :id when no Express route is matched', async () => {
    const app = buildApp();

    await request(app).get('/api/items/12345');
    await flushPromises();

    const lpushKey = mockRedis.lpush.mock.calls[0]![0] as string;
    expect(lpushKey).toContain(':id');
    expect(lpushKey).not.toContain('12345');
  });

  it('should store duration, status code, and timestamp in the lpush payload', async () => {
    const app = buildApp((a) => {
      a.get('/api/test', (_req, res) => res.status(201).json({ ok: true }));
    });

    await request(app).get('/api/test');
    await flushPromises();

    const payload = JSON.parse(mockRedis.lpush.mock.calls[0]![1] as string);
    expect(typeof payload.ms).toBe('number');
    expect(payload.ms).toBeGreaterThanOrEqual(0);
    expect(payload.status).toBe(201);
    expect(typeof payload.ts).toBe('number');
  });

  it('should trim the Redis list to 200 entries after each push', async () => {
    const app = buildApp((a) => {
      a.get('/api/test', (_req, res) => res.json({ ok: true }));
    });

    await request(app).get('/api/test');
    await flushPromises();

    expect(mockRedis.ltrim).toHaveBeenCalledWith(expect.any(String), 0, 199);
  });

  it('should build the Redis key with format "metrics:api:METHOD|route"', async () => {
    const app = buildApp((a) => {
      a.post('/api/v1/test', (_req, res) => res.json({ ok: true }));
    });

    await request(app).post('/api/v1/test');
    await flushPromises();

    const lpushKey = mockRedis.lpush.mock.calls[0]![0] as string;
    expect(lpushKey).toMatch(/^metrics:api:POST\|/);
  });

  it('should set a 24-hour TTL on the Redis key', async () => {
    const app = buildApp((a) => {
      a.get('/api/test', (_req, res) => res.json({ ok: true }));
    });

    await request(app).get('/api/test');
    await flushPromises();

    expect(mockRedis.expire).toHaveBeenCalledWith(expect.any(String), 86400);
  });

  it('should not throw when Redis operations fail', async () => {
    mockRedis.lpush.mockRejectedValue(new Error('Redis connection lost'));
    const app = buildApp((a) => {
      a.get('/api/test', (_req, res) => res.json({ ok: true }));
    });

    await expect(request(app).get('/api/test')).resolves.toBeDefined();
  });
});
