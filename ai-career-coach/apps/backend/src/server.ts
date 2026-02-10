// apps/backend/src/server.ts
import express from 'express';
import type { Request, Response, NextFunction, RequestHandler } from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import authRoutes from './routes/auth.routes.js';
import profileRoutes from "./routes/profile.routes.js";
import mlRoutes from "./routes/ml.routes.js";
import { connectMongoDB } from './config/database.js';
import jobRoutes from './routes/jobs.routes.js';
import matchingRoutes from './routes/matching.routes.js';
import salaryRoutes from './routes/salary.routes.js';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;

/**
 * Middleware setup
 */

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

// Request logging in development
if (process.env.NODE_ENV === 'development') {
  app.use((req: Request, res: Response, next: NextFunction) => {
    console.log(`${req.method} ${req.path}`);
    next();
  });
}

/**
 * Routes
 */

// Auth routes
app.use('/api/auth', authRoutes);

// Profile routes
app.use('/api/profile', profileRoutes);

// ML service routes
app.use('/api/ml', mlRoutes);
// Job routes
app.use('/api/jobs', jobRoutes);

// Upload routes (static files)
app.use('/uploads', express.static('public/uploads'));

app.use('/api/matching', matchingRoutes);

// Salary insights routes
app.use('/api/salary', salaryRoutes);

// Debug: List all registered routes
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
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error('Unhandled error:', err);

  res.status(500).json({
    success: false,
    message: 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { error: err.message }),
  });
});

/**
 * Initialize database connections and start server
 */
async function startServer() {
  try {
    // Connect to MongoDB (Prisma connects automatically)
    await connectMongoDB();
    
    // Start HTTP server
    const server = app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`📝 Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`🌐 Frontend URL: ${process.env.FRONTEND_URL}`);
      console.log(`🤖 ML Service URL: ${process.env.ML_SERVICE_URL}`);
    });

    // Increase server timeout for long-running ML operations (3 minutes)
    server.timeout = 180000;
    server.keepAliveTimeout = 180000;

    // Graceful shutdown
    process.on('SIGTERM', () => {
      console.log('SIGTERM received, shutting down gracefully');
      server.close(() => {
        console.log('Server closed');
        process.exit(0);
      });
    });

  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Start the server
startServer();

export default app;