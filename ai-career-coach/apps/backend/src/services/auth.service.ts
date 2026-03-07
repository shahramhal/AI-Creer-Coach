// apps/backend/src/services/auth.service.ts

import bcrypt from 'bcrypt';
import { PrismaClient } from '@prisma/client';
import {
  generateAccessToken,
  generateRefreshToken,
  generateEmailVerifyToken,
  generatePasswordResetToken,
  verifyRefreshToken,
} from '../utils/jwt.util.js';
import { sendVerificationEmail, sendPasswordResetEmail } from '../utils/email.util.js';
import { AppError, ErrorCodes } from '../utils/app-error.util.js';

const prisma = new PrismaClient();

// Registration data structure
interface RegisterData {
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
}

// Login response structure
interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  user: {
    id: string;
    email: string;
    firstName: string | null;
    lastName: string | null;
    isEmailVerified: boolean;
    role: string;
  };
}

export class AuthService {
  /**
   * Register new user
   * - Hashes password
   * - Creates user record
   * - Sends verification email
   */
  async register(data: RegisterData) {
    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { email: data.email },
    });

    if (existingUser) {
      throw new AppError('User already exists with this email', 409, ErrorCodes.EMAIL_ALREADY_EXISTS);
    }

    // Hash password (10 salt rounds - good balance of security and speed)
    const hashedPassword = await bcrypt.hash(data.password, 10);

    // Generate email verification token
   

    // Create user
    const user = await prisma.user.create({
      data: {
        email: data.email,
        passwordHash: hashedPassword,
        firstName: data.firstName ?? null,
        lastName: data.lastName ?? null,
        
      },
    });
     const verifyToken = generateEmailVerifyToken({
      userId: user.id, 
      email: data.email,
    });
    await prisma.user.update({
      where: { id: user.id },
      data: {
        emailVerifyToken: verifyToken,
      },
    });

    // Send verification email (async, don't block response)
    sendVerificationEmail(user.email, verifyToken).catch((error) => {
      console.error('Failed to send verification email:', error);
    });

    return {
      id: user.id,
      email: user.email,
      message: 'Registration successful. Please check your email to verify your account.',
    };
  }

  /**
   * Login user
   * - Validates credentials
   * - Returns access and refresh tokens
   */
  async login(email: string, password: string): Promise<LoginResponse> {
    // Find user
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      throw new AppError('No account found with that email address.', 401, ErrorCodes.EMAIL_NOT_FOUND);
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);

    if (!isPasswordValid) {
      throw new AppError('Incorrect password. Please try again.', 401, ErrorCodes.INVALID_CREDENTIALS);
    }

    // Check if account is disabled
    if (user.isDisabled) {
      throw new AppError('Account is disabled. Please contact support.', 403, ErrorCodes.ACCOUNT_DISABLED);
    }

    // Update last login timestamp
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    // Generate tokens
    const tokenPayload = { userId: user.id, email: user.email };
    const accessToken = generateAccessToken(tokenPayload);
    const refreshToken = generateRefreshToken(tokenPayload);

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        isEmailVerified: user.isEmailVerified,
        role: user.role,
      },
    };
  }

  /**
   * Verify email with token
   */
  async verifyEmail(token: string) {
    // Find user with this token
    const user = await prisma.user.findUnique({
      where: { emailVerifyToken: token },
    });

    if (!user) {
      throw new AppError('Invalid or expired verification token', 401, ErrorCodes.TOKEN_INVALID);
    }

    // Update user
    await prisma.user.update({
      where: { id: user.id },
      data: {
        isEmailVerified: true,
        emailVerifyToken: null, // Clear token after use
      },
    });

    return { message: 'Email verified successfully' };
  }

  /**
   * Request password reset
   * - Generates reset token
   * - Sends email with reset link
   */
  async requestPasswordReset(email: string) {
    const user = await prisma.user.findUnique({
      where: { email },
    });

    // Don't reveal if user exists (security best practice)
    if (!user) {
      return { message: 'If that email exists, a reset link has been sent' };
    }

    // Generate reset token
    const resetToken = generatePasswordResetToken({
      userId: user.id,
      email: user.email,
    });

    // Save token with expiration (1 hour)
    await prisma.user.update({
      where: { id: user.id },
      data: {
        resetPasswordToken: resetToken,
        resetPasswordExpires: new Date(Date.now() + 3600000), // 1 hour
      },
    });

    // Send reset email
    await sendPasswordResetEmail(user.email, resetToken);

    return { message: 'If that email exists, a reset link has been sent' };
  }

  /**
   * Reset password with token
   */
  async resetPassword(token: string, newPassword: string) {
    // Find user with valid token
    const user = await prisma.user.findFirst({
      where: {
        resetPasswordToken: token,
        resetPasswordExpires: { gte: new Date() }, // Token not expired
      },
    });

    if (!user) {
      throw new AppError('Invalid or expired reset token', 401, ErrorCodes.TOKEN_INVALID);
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update password and clear reset token
    await prisma.user.update({
      where: { id: user.id },
      data: {
       passwordHash: hashedPassword,
        resetPasswordToken: null,
        resetPasswordExpires: null,
      },
    });

    return { message: 'Password reset successfully' };
  }

  /**
   * Refresh access token using refresh token
   */
  async refreshAccessToken(refreshToken: string) {
    // Verify refresh token
    const decoded = verifyRefreshToken(refreshToken);

    // Check if user still exists
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
    });

    if (!user) {
      throw new AppError('User not found', 404, ErrorCodes.NOT_FOUND);
    }

    // Generate new access token
    const newAccessToken = generateAccessToken({
      userId: user.id,
      email: user.email,
    });

    return { accessToken: newAccessToken };
  }
}