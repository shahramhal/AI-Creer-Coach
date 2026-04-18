// apps/backend/src/utils/email.util.ts

import nodemailer from 'nodemailer';
import { logger } from './logger.js';

/**
 * Email transporter configuration
 * Uses Gmail SMTP - can be replaced with SendGrid, AWS SES, etc.
 */
function escapeHtml(unsafeText: string): string {
  return unsafeText
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

const createTransporter = () => {
  return nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: parseInt(process.env.EMAIL_PORT || '587'),
    secure: false,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASSWORD?.replace(/\s/g, ''),
    },
    connectionTimeout: 10000,
    socketTimeout: 10000,
  });
};

/**
 * Send email verification link
 * User clicks link to verify their email address
 */
export const sendVerificationEmail = async (email: string, token: string) => {
  const transporter = createTransporter();
  const verificationUrl = `${process.env.FRONTEND_URL}/auth/verify-email?token=${token}`;

  const mailOptions = {
    from: process.env.EMAIL_FROM,
    to: email,
    subject: 'Verify Your Email - AI Career Coach',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Welcome to AI Career Coach!</h2>
        <p>Thank you for registering. Please verify your email address to get started.</p>
        <div style="margin: 30px 0;">
          <a href="${verificationUrl}" 
             style="background-color: #4F46E5; color: white; padding: 12px 24px; 
                    text-decoration: none; border-radius: 6px; display: inline-block;">
            Verify Email
          </a>
        </div>
        <p style="color: #666; font-size: 14px;">
          Or copy this link: <br>
          <a href="${verificationUrl}">${verificationUrl}</a>
        </p>
        <p style="color: #666; font-size: 14px;">
          This link will expire in 24 hours.
        </p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
        <p style="color: #999; font-size: 12px;">
          If you didn't create this account, you can safely ignore this email.
        </p>
      </div>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
    logger.info(`Verification email sent to ${email}`);
  } catch (error) {
    logger.error(error);
    throw new Error('Failed to send verification email');
  }
};

/**
 * Send password reset link
 * User clicks link to reset their password
 */
export const sendPasswordResetEmail = async (email: string, token: string) => {
  const transporter = createTransporter();
  const resetUrl = `${process.env.FRONTEND_URL}/auth/reset-password?token=${token}`;

  const mailOptions = {
    from: process.env.EMAIL_FROM,
    to: email,
    subject: 'Reset Your Password - AI Career Coach',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Password Reset Request</h2>
        <p>We received a request to reset your password. Click the button below to proceed.</p>
        <div style="margin: 30px 0;">
          <a href="${resetUrl}" 
             style="background-color: #EF4444; color: white; padding: 12px 24px; 
                    text-decoration: none; border-radius: 6px; display: inline-block;">
            Reset Password
          </a>
        </div>
        <p style="color: #666; font-size: 14px;">
          Or copy this link: <br>
          <a href="${resetUrl}">${resetUrl}</a>
        </p>
        <p style="color: #666; font-size: 14px;">
          This link will expire in 1 hour.
        </p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
        <p style="color: #999; font-size: 12px;">
          If you didn't request this, you can safely ignore this email. Your password won't be changed.
        </p>
      </div>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
    logger.info(`Password reset email sent to ${email}`);
  } catch (error) {
    logger.error(error);
    throw new Error('Failed to send password reset email');
  }
};

/**
 * Send notification email when an admin disables a user account.
 * Non-throwing - email failure should not block the disable action.
 */
export const sendAccountDisabledEmail = async (email: string, firstName: string) => {
  const transporter = createTransporter();

  const mailOptions = {
    from: process.env.EMAIL_FROM,
    to: email,
    subject: 'Your Account Has Been Disabled - AI Career Coach',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Account Disabled</h2>
        <p>Hi ${escapeHtml(firstName || 'there')},</p>
        <p>We're writing to let you know that your AI Career Coach account has been disabled by an administrator.</p>
        <p>While your account is disabled, you will not be able to log in or access any services.</p>
        <div style="margin: 30px 0; padding: 16px; background-color: #FEF2F2; border-radius: 6px; border-left: 4px solid #EF4444;">
          <p style="margin: 0; color: #991B1B;">
            If you believe this was done in error, please contact our support team for assistance.
          </p>
        </div>
        <div style="margin: 30px 0;">
          <a href="mailto:${process.env.SUPPORT_EMAIL || process.env.EMAIL_FROM}"
             style="background-color: #4F46E5; color: white; padding: 12px 24px;
                    text-decoration: none; border-radius: 6px; display: inline-block;">
            Contact Support
          </a>
        </div>
        <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
        <p style="color: #999; font-size: 12px;">
          This is an automated message from AI Career Coach.
        </p>
      </div>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
    logger.info(`Account disabled email sent to ${email}`);
  } catch (error) {
    logger.error(error);
    // Don't throw - notification email is not critical
  }
};

export const sendWelcomeEmail = async (email: string, firstName: string) => {
  const transporter = createTransporter();

  const mailOptions = {
    from: process.env.EMAIL_FROM,
    to: email,
    subject: 'Welcome to AI Career Coach!',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Welcome, ${escapeHtml(firstName)}!</h2>
        <p>Your email has been verified. You're all set to start your career journey.</p>
        <h3>What's next?</h3>
        <ul>
          <li>Upload your CV to get personalized job recommendations</li>
          <li>Explore job matches tailored to your skills</li>
          <li>Get insights on salary expectations</li>
          <li>Practice with AI-powered mock interviews</li>
        </ul>
        <div style="margin: 30px 0;">
          <a href="${process.env.FRONTEND_URL}/dashboard" 
             style="background-color: #4F46E5; color: white; padding: 12px 24px; 
                    text-decoration: none; border-radius: 6px; display: inline-block;">
            Go to Dashboard
          </a>
        </div>
      </div>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
    logger.info(`Welcome email sent to ${email}`);
  } catch (error) {
    logger.error(error);
    // Don't throw - welcome email is not critical
  }
};