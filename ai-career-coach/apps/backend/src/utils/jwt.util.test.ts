// apps/backend/src/utils/jwt.util.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import jwt from 'jsonwebtoken';
import {
  generateAccessToken,
  generateRefreshToken,
  generateEmailVerifyToken,
  generatePasswordResetToken,
  verifyAccessToken,
  verifyRefreshToken,
} from './jwt.util.js';

const validUserPayload = {
  userId: 'user-uuid-1234',
  email: 'test@example.com',
};

describe('JWT Utility Functions', () => {
  describe('generateAccessToken', () => {
    it('should generate a valid JWT access token string', () => {
      const accessToken = generateAccessToken(validUserPayload);

      expect(typeof accessToken).toBe('string');
      expect(accessToken.split('.').length).toBe(3); // JWT has 3 parts
    });

    it('should embed the userId and email into the token payload', () => {
      const accessToken = generateAccessToken(validUserPayload);
      const decoded = jwt.decode(accessToken) as any;

      expect(decoded.userId).toBe(validUserPayload.userId);
      expect(decoded.email).toBe(validUserPayload.email);
    });

    it('should throw an error when JWT_SECRET environment variable is missing', () => {
      const originalSecret = process.env.JWT_SECRET;
      delete process.env.JWT_SECRET;

      expect(() => generateAccessToken(validUserPayload)).toThrow('JWT_SECRET not configured');

      process.env.JWT_SECRET = originalSecret;
    });

    it('should include an expiration time in the generated token', () => {
      const accessToken = generateAccessToken(validUserPayload);
      const decoded = jwt.decode(accessToken) as any;

      expect(decoded.exp).toBeDefined();
      expect(decoded.iat).toBeDefined();
      expect(decoded.exp).toBeGreaterThan(decoded.iat);
    });
  });

  describe('generateRefreshToken', () => {
    it('should generate a valid JWT refresh token string', () => {
      const refreshToken = generateRefreshToken(validUserPayload);

      expect(typeof refreshToken).toBe('string');
      expect(refreshToken.split('.').length).toBe(3);
    });

    it('should embed the userId and email into the refresh token payload', () => {
      const refreshToken = generateRefreshToken(validUserPayload);
      const decoded = jwt.decode(refreshToken) as any;

      expect(decoded.userId).toBe(validUserPayload.userId);
      expect(decoded.email).toBe(validUserPayload.email);
    });

    it('should throw an error when JWT_REFRESH_SECRET environment variable is missing', () => {
      const originalRefreshSecret = process.env.JWT_REFRESH_SECRET;
      delete process.env.JWT_REFRESH_SECRET;

      expect(() => generateRefreshToken(validUserPayload)).toThrow('JWT_REFRESH_SECRET not configured');

      process.env.JWT_REFRESH_SECRET = originalRefreshSecret;
    });
  });

  describe('generateEmailVerifyToken', () => {
    it('should generate a valid JWT email verification token', () => {
      const emailVerifyToken = generateEmailVerifyToken(validUserPayload);

      expect(typeof emailVerifyToken).toBe('string');
      expect(emailVerifyToken.split('.').length).toBe(3);
    });

    it('should set 24-hour expiration on email verification token', () => {
      const emailVerifyToken = generateEmailVerifyToken(validUserPayload);
      const decoded = jwt.decode(emailVerifyToken) as any;

      const tokenLifespanInSeconds = decoded.exp - decoded.iat;
      const expectedLifespanInSeconds = 24 * 60 * 60;

      expect(tokenLifespanInSeconds).toBe(expectedLifespanInSeconds);
    });
  });

  describe('generatePasswordResetToken', () => {
    it('should generate a valid JWT password reset token', () => {
      const passwordResetToken = generatePasswordResetToken(validUserPayload);

      expect(typeof passwordResetToken).toBe('string');
      expect(passwordResetToken.split('.').length).toBe(3);
    });

    it('should set 1-hour expiration on password reset token', () => {
      const passwordResetToken = generatePasswordResetToken(validUserPayload);
      const decoded = jwt.decode(passwordResetToken) as any;

      const tokenLifespanInSeconds = decoded.exp - decoded.iat;
      const expectedLifespanInSeconds = 60 * 60;

      expect(tokenLifespanInSeconds).toBe(expectedLifespanInSeconds);
    });
  });

  describe('verifyAccessToken', () => {
    it('should successfully verify and decode a valid access token', () => {
      const accessToken = generateAccessToken(validUserPayload);
      const decodedToken = verifyAccessToken(accessToken);

      expect(decodedToken.userId).toBe(validUserPayload.userId);
      expect(decodedToken.email).toBe(validUserPayload.email);
    });

    it('should throw "Invalid token" error when given a malformed token string', () => {
      const malformedToken = 'not.a.valid.jwt.token';

      expect(() => verifyAccessToken(malformedToken)).toThrow('Invalid token');
    });

    it('should throw "Token expired" error when given an expired access token', () => {
      const expiredToken = jwt.sign(
        { userId: 'user-123', email: 'user@test.com' },
        process.env.JWT_SECRET!,
        { expiresIn: -1 } // Already expired
      );

      expect(() => verifyAccessToken(expiredToken)).toThrow('Token expired');
    });

    it('should throw "Invalid token" when token was signed with a different secret', () => {
      const tokenSignedWithWrongSecret = jwt.sign(
        { userId: 'user-123', email: 'user@test.com' },
        'completely-different-wrong-secret'
      );

      expect(() => verifyAccessToken(tokenSignedWithWrongSecret)).toThrow('Invalid token');
    });

    it('should throw when JWT_SECRET is missing during verification', () => {
      const accessToken = generateAccessToken(validUserPayload);
      const originalSecret = process.env.JWT_SECRET;
      delete process.env.JWT_SECRET;

      expect(() => verifyAccessToken(accessToken)).toThrow('JWT_SECRET not configured');

      process.env.JWT_SECRET = originalSecret;
    });
  });

  describe('verifyRefreshToken', () => {
    it('should successfully verify and decode a valid refresh token', () => {
      const refreshToken = generateRefreshToken(validUserPayload);
      const decodedToken = verifyRefreshToken(refreshToken);

      expect(decodedToken.userId).toBe(validUserPayload.userId);
      expect(decodedToken.email).toBe(validUserPayload.email);
    });

    it('should throw "Invalid refresh token" error when given a malformed token', () => {
      const malformedToken = 'definitely.not.a.jwt';

      expect(() => verifyRefreshToken(malformedToken)).toThrow('Invalid refresh token');
    });

    it('should throw "Refresh token expired" error when given an expired refresh token', () => {
      const expiredRefreshToken = jwt.sign(
        { userId: 'user-123', email: 'user@test.com' },
        process.env.JWT_REFRESH_SECRET!,
        { expiresIn: -1 }
      );

      expect(() => verifyRefreshToken(expiredRefreshToken)).toThrow('Refresh token expired');
    });

    it('should not verify an access token as a valid refresh token', () => {
      // Precondition: secrets must differ for token-swap detection to work
      const secretsAreDifferent = process.env.JWT_SECRET !== process.env.JWT_REFRESH_SECRET;
      expect(secretsAreDifferent, 'JWT_SECRET and JWT_REFRESH_SECRET must differ for this test to be meaningful').toBe(true);

      const accessToken = generateAccessToken(validUserPayload);
      expect(() => verifyRefreshToken(accessToken)).toThrow('Invalid refresh token');
    });
  });
});
