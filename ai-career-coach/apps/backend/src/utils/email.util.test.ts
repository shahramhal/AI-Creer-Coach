// apps/backend/src/utils/email.util.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';

// nodemailer is mocked in test-setup.ts globally
import nodemailer from 'nodemailer';
import {
  sendVerificationEmail,
  sendPasswordResetEmail,
  sendWelcomeEmail,
} from './email.util.js';

let mockTransporter: { sendMail: ReturnType<typeof vi.fn> };

describe('Email Utility Functions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Create a fresh transporter mock each time — clearAllMocks wipes implementations
    mockTransporter = {
      sendMail: vi.fn().mockResolvedValue({ messageId: 'mock-message-id-123' }),
    };
    vi.mocked(nodemailer.createTransport).mockReturnValue(mockTransporter as any);
  });

  describe('sendVerificationEmail', () => {
    it('should call sendMail with recipient address and verification subject', async () => {
      const recipientEmail = 'verify-me@example.com';
      const verificationToken = 'abc-def-123-ghi';

      await sendVerificationEmail(recipientEmail, verificationToken);

      expect(mockTransporter.sendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: recipientEmail,
          subject: expect.stringContaining('Verify'),
          html: expect.stringContaining(verificationToken),
        })
      );
    });

    it('should include the verification URL with the token in the email HTML body', async () => {
      const recipientEmail = 'recipient@example.com';
      const verificationToken = 'unique-verify-token-xyz';
      const expectedVerificationUrl = `${process.env.FRONTEND_URL}/auth/verify-email?token=${verificationToken}`;

      await sendVerificationEmail(recipientEmail, verificationToken);

      const sendMailCallArgs = mockTransporter.sendMail.mock.calls[0][0];
      expect(sendMailCallArgs.html).toContain(expectedVerificationUrl);
    });

    it('should throw an error when nodemailer sendMail rejects', async () => {
      mockTransporter.sendMail.mockRejectedValueOnce(new Error('SMTP connection refused'));

      await expect(
        sendVerificationEmail('error@example.com', 'token-123')
      ).rejects.toThrow('Failed to send verification email');
    });
  });

  describe('sendPasswordResetEmail', () => {
    it('should call sendMail with recipient address and password reset subject', async () => {
      const recipientEmail = 'reset-my-password@example.com';
      const resetToken = 'reset-token-abc-def-456';

      await sendPasswordResetEmail(recipientEmail, resetToken);

      expect(mockTransporter.sendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: recipientEmail,
          subject: expect.stringContaining('Reset'),
          html: expect.stringContaining(resetToken),
        })
      );
    });

    it('should include the correct password reset URL with the token in the email HTML body', async () => {
      const recipientEmail = 'reset@example.com';
      const resetToken = 'my-secure-reset-token-789';
      const expectedResetUrl = `${process.env.FRONTEND_URL}/auth/reset-password?token=${resetToken}`;

      await sendPasswordResetEmail(recipientEmail, resetToken);

      const sendMailCallArgs = mockTransporter.sendMail.mock.calls[0][0];
      expect(sendMailCallArgs.html).toContain(expectedResetUrl);
    });

    it('should throw an error when password reset email sending fails', async () => {
      mockTransporter.sendMail.mockRejectedValueOnce(new Error('Mailbox unavailable'));

      await expect(
        sendPasswordResetEmail('fail@example.com', 'token-fail')
      ).rejects.toThrow('Failed to send password reset email');
    });

    it('should mention 1-hour expiry in the email HTML body', async () => {
      await sendPasswordResetEmail('user@example.com', 'token-expiry-check');

      const sendMailCallArgs = mockTransporter.sendMail.mock.calls[0][0];
      expect(sendMailCallArgs.html).toContain('1 hour');
    });
  });

  describe('sendWelcomeEmail', () => {
    it('should call sendMail with recipient address and a welcome subject', async () => {
      const recipientEmail = 'new-verified-user@example.com';
      const userFirstName = 'Alice';

      await sendWelcomeEmail(recipientEmail, userFirstName);

      expect(mockTransporter.sendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: recipientEmail,
          subject: expect.stringContaining('Welcome'),
        })
      );
    });

    it('should include the user first name in the welcome email HTML body', async () => {
      const recipientEmail = 'bob@example.com';
      const userFirstName = 'Bob';

      await sendWelcomeEmail(recipientEmail, userFirstName);

      const sendMailCallArgs = mockTransporter.sendMail.mock.calls[0][0];
      expect(sendMailCallArgs.html).toContain(userFirstName);
    });

    it('should not throw when welcome email sending fails — it is non-critical', async () => {
      mockTransporter.sendMail.mockRejectedValueOnce(new Error('SMTP error - welcome email failed'));

      // sendWelcomeEmail catches errors internally and does not re-throw
      await expect(
        sendWelcomeEmail('nothrow@example.com', 'Charlie')
      ).resolves.toBeUndefined();
    });

    it('should include the dashboard URL in the welcome email', async () => {
      await sendWelcomeEmail('dashboard@example.com', 'Dave');

      const sendMailCallArgs = mockTransporter.sendMail.mock.calls[0][0];
      expect(sendMailCallArgs.html).toContain('dashboard');
    });
  });
});
