// apps/backend/src/server.ts
import express from 'express';
import type { Request, Response, NextFunction, RequestHandler } from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import authRoutes from './routes/auth.routes.js';
// Add this debug line
console.log('authRoutes imported:', authRoutes);
console.log('typeof authRoutes:', typeof authRoutes);

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

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

import testRoutes from './routes/test.routes';

// After health check
app.use('/api/test', testRoutes);
// Parse JSON request bodies
app.use(express.json());

// Parse URL-encoded bodies
app.use(express.urlencoded({ extended: true }));

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

// Health check endpoint
app.get('/health', (req: Request, res: Response) => {
  res.json({
    success: true,
    message: 'Server is running',
    timestamp: new Date().toISOString(),
  });
});

// Auth routes
app.use('/api/auth', authRoutes);

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
 * Start server
 */
const server = app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📝 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🌐 Frontend URL: ${process.env.FRONTEND_URL}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

export default app;