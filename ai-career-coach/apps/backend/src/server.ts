// apps/backend/src/server.ts
import express from 'express';
import type { Request, Response, NextFunction, RequestHandler } from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import compression from 'compression';
import pinoHttp from 'pino-http';
import { randomUUID } from 'crypto';
import { logger } from './utils/logger.js';
import dotenv from 'dotenv';
import authRoutes from './routes/auth.routes.js';
import profileRoutes from "./routes/profile.routes.js";
import mlRoutes from "./routes/ml.routes.js";
import { connectMongoDB, closeDatabaseConnections } from './config/database.js';
import jobRoutes from './routes/jobs.routes.js';
import matchingRoutes from './routes/matching.routes.js';
import salaryRoutes from './routes/salary.routes.js';
import applicationRoutes from './routes/applications.routes.js';
import adminRoutes from './routes/admin.routes.js';
import skillGapRoutes from './routes/skillGap.routes.js';
import dashboardRoutes from './routes/dashboard.routes.js';
import { globalErrorHandler } from './middlewares/error.middleware.js';
import { apiMetricsMiddleware } from './middlewares/metrics.middleware.js';
import swaggerUi from 'swagger-ui-express';
import { swaggerSpec } from './config/swagger.js';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;

/**
 * Middleware setup
 */

// Security headers
app.use(helmet());

// Gzip compression
app.use(compression() as RequestHandler);

// Structured request logging with correlation IDs
app.use(pinoHttp({
  logger,
  genReqId: () => randomUUID(),
  customSuccessMessage: (req, res) =>
    `${req.method} ${(req as Request).path} ${res.statusCode}`,
  customErrorMessage: (req, res) =>
    `${req.method} ${(req as Request).path} ${res.statusCode}`,
  customAttributeKeys: { reqId: 'requestId' },
}) as RequestHandler);

// Expose request ID in response header for client-side tracing
app.use((req: Request, res: Response, next: NextFunction) => {
  res.setHeader('x-request-id', (req as any).id ?? '');
  next();
});

// Collect per-route response time metrics in Redis
app.use(apiMetricsMiddleware as RequestHandler);

// CORS - Allow frontend to make requests
app.use(
  cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true, // Allow cookies
  })
);

// Parse JSON request bodies (increased limit for large job payloads)
app.use(express.json({ limit: '10mb' }));

// Parse URL-encoded bodies
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Parse cookies (for refresh token)
app.use(cookieParser() as RequestHandler);

/**
 * Routes
 */

// Load balancer health check - no auth required
app.get('/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', uptime: process.uptime() });
});

// Auth routes
app.use('/api/v1/auth', authRoutes);

// Profile routes
app.use('/api/v1/profile', profileRoutes);

// ML service routes
app.use('/api/v1/ml', mlRoutes);
// Job routes
app.use('/api/v1/jobs', jobRoutes);

// Upload routes (static files)
// Override CORP header so cross-origin pages (frontend at :3000) can display images served from this server
app.use('/uploads', (_req: Request, res: Response, next: NextFunction) => {
  res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
  next();
}, express.static('public/uploads'));

app.use('/api/v1/matching', matchingRoutes);

// Salary insights routes
app.use('/api/v1/salary', salaryRoutes);

// Application routes (ATS scoring)
app.use('/api/v1/applications', applicationRoutes);

// Admin routes
app.use('/api/v1/admin', adminRoutes);

// Skill gap & learning path routes
app.use('/api/v1/skill-gap', skillGapRoutes);

// Dashboard routes
app.use('/api/v1/dashboard', dashboardRoutes);

if (process.env.NODE_ENV === 'development') {
  app.get('/api/debug/routes', (req: Request, res: Response) => {
    const routes: string[] = [];
    app._router.stack.forEach((middleware: any) => {
      if (middleware.route) {
        routes.push(`${Object.keys(middleware.route.methods).join(',')} ${middleware.route.path}`);
      } else if (middleware.name === 'router') {
        middleware.handle.stack.forEach((handler: any) => {
          if (handler.route) {
            const path = middleware.regexp.toString().includes('matching') ? '/api/matching' :
                         middleware.regexp.toString().includes('auth') ? '/api/auth' :
                         middleware.regexp.toString().includes('ml') ? '/api/ml' : '';
            routes.push(`${Object.keys(handler.route.methods).join(',')} ${path}${handler.route.path}`);
          }
        });
      }
    });
    res.json({ routes, matchingLoaded: !!matchingRoutes });
  });
}

// Swagger UI
app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
app.get('/api/docs.json', (_req: Request, res: Response) => {
  res.setHeader('Content-Type', 'application/json');
  res.send(swaggerSpec);
});

// 404 handler
app.use((req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    message: 'Endpoint not found',
  });
});

/**
 * Global error handler
 */
app.use(globalErrorHandler);

/**
 * Initialize database connections and start server
 */
async function startServer() {
  try {
    // Connect to MongoDB (Prisma connects automatically)
    await connectMongoDB();
    
    // Start HTTP server
    const server = app.listen(PORT, () => {
      logger.info({ port: PORT, env: process.env.NODE_ENV || 'development' }, 'Server started');
    });

    // Increase server timeout for long-running ML operations (3 minutes)
    server.timeout = 180000;
    server.keepAliveTimeout = 180000;

    // Graceful shutdown - single SIGTERM handler that closes HTTP then DB
    process.on('SIGTERM', () => {
      logger.info('SIGTERM received, shutting down gracefully');
      server.close(async () => {
        logger.info('Server closed');
        await closeDatabaseConnections();
        process.exit(0);
      });
    });

  } catch (error) {
    logger.error(error, 'Failed to start server');
    process.exit(1);
  }
}

// Start the server
startServer();

export default app;