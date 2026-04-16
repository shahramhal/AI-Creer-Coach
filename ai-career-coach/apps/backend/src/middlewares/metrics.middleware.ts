// apps/backend/src/middlewares/metrics.middleware.ts

import type { Request, Response, NextFunction } from 'express';
import { redis } from '../config/database.js';

const KEY_PREFIX = 'metrics:api:';
const MAX_SAMPLES = 200;
const TTL_SECONDS = 86400;

// Replace dynamic path segments so we don't create unbounded keys per request.
// Express route patterns use :param, raw paths may have UUIDs or numeric IDs.
function normalizeRawPath(path: string): string {
  return path
    .replace(/\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, '/:id')
    .replace(/\/\d+(?=\/|$)/g, '/:id')
    .replace(/\/$/, '') || '/';
}

// Use "|" as method/route separator since it's not a valid URL character,
// avoiding ambiguity with ":" which appears in Express route params.
function buildKey(method: string, route: string): string {
  return `${KEY_PREFIX}${method}|${route}`;
}

export function parseMetricKey(key: string): { method: string; route: string } {
  const withoutPrefix = key.slice(KEY_PREFIX.length);
  const pipeIndex = withoutPrefix.indexOf('|');
  return {
    method: withoutPrefix.slice(0, pipeIndex),
    route: withoutPrefix.slice(pipeIndex + 1),
  };
}

export function apiMetricsMiddleware(req: Request, res: Response, next: NextFunction): void {
  const start = Date.now();

  res.on('finish', () => {
    if (req.method === 'OPTIONS') return;
    if (req.path === '/' || req.path === '/health' || req.path.startsWith('/api/docs')) return;

    const duration = Date.now() - start;
    const routePath = (req.route?.path as string | undefined) ?? normalizeRawPath(req.path);
    const key = buildKey(req.method, routePath);

    void redis
      .lpush(key, JSON.stringify({ ms: duration, status: res.statusCode, ts: Date.now() }))
      .then(() => redis.ltrim(key, 0, MAX_SAMPLES - 1))
      .then(() => redis.expire(key, TTL_SECONDS))
      .catch(() => {});
  });

  next();
}
