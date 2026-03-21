// apps/backend/src/utils/jwt.util.ts

import jwt from 'jsonwebtoken';
import type {SignOptions} from 'jsonwebtoken';

// Token payload structure
interface TokenPayload {
  userId: string;
  email: string;
}

// Decoded token structure (includes JWT standard fields)
interface DecodedToken extends TokenPayload {
  iat: number; // Issued at
  exp: number; // Expiration
}

/**
 * Generates access token (short-lived)
 * Used for API authentication
 */
export const generateAccessToken = (payload: TokenPayload): string => {
  const secret = process.env.JWT_SECRET;

  if (!secret) {
    throw new Error('JWT_SECRET not configured');
  }

  return jwt.sign(payload, secret, {
    expiresIn: (process.env.JWT_EXPIRES_IN || '1h') as any
  });
};

/**
 * Generates refresh token (long-lived)
 * Used to obtain new access tokens
 */
export const generateRefreshToken = (payload: TokenPayload): string => {
  const secret = process.env.JWT_REFRESH_SECRET;

  if (!secret) {
    throw new Error('JWT_REFRESH_SECRET not configured');
  }

  return jwt.sign(payload, secret, {
    expiresIn: (process.env.JWT_REFRESH_EXPIRES_IN || '7d') as any
  });
};

/**
 * Verifies and decodes access token
 * Throws error if token is invalid or expired
 */
export const verifyAccessToken = (token: string): DecodedToken => {
  const secret = process.env.JWT_SECRET;

  if (!secret) {
    throw new Error('JWT_SECRET not configured');
  }

  try {
    return jwt.verify(token, secret) as DecodedToken;
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      throw new Error('Token expired');
    }
    if (error instanceof jwt.JsonWebTokenError) {
      throw new Error('Invalid token');
    }
    throw error;
  }
};

/**
 * Verifies and decodes refresh token
 */
export const verifyRefreshToken = (token: string): DecodedToken => {
  const secret = process.env.JWT_REFRESH_SECRET;

  if (!secret) {
    throw new Error('JWT_REFRESH_SECRET not configured');
  }

  try {
    return jwt.verify(token, secret) as DecodedToken;
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      throw new Error('Refresh token expired');
    }
    if (error instanceof jwt.JsonWebTokenError) {
      throw new Error('Invalid refresh token');
    }
    throw error;
  }
};

/**
 * Generates email verification token (24h expiry)
 */
export const generateEmailVerifyToken = (payload: TokenPayload): string => {
  const secret = process.env.JWT_SECRET;

  if (!secret) {
    throw new Error('JWT_SECRET not configured');
  }

  return jwt.sign(payload, secret, {
    expiresIn: '24h' as any
  });
};

/**
 * Generates password reset token (1h expiry)
 */
export const generatePasswordResetToken = (payload: TokenPayload): string => {
  const secret = process.env.JWT_SECRET;

  if (!secret) {
    throw new Error('JWT_SECRET not configured');
  }

  return jwt.sign(payload, secret, {
    expiresIn: '1h' as any
  });
};