// apps/backend/src/utils/email.util.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';

// var is hoisted so the factory can assign before tests run
var mockSend: ReturnType<typeof vi.fn>;

vi.mock('resend', () => {
  const send = vi.fn().mockResolvedValue({ data: { id: 'mock-email-id' }, error: null });
  mockSend = send;
  function ResendMock(this: any) {
    this.emails = { send };
  }
  return { Resend: ResendMock };
});

import {
  sendVerificationEmail,
  sendPasswordResetEmail,
  sendWelcomeEmail,
} from './email.util.js';

describe('Email Utility Functions', () => {
  beforeEach(() => {
    mockSend.mockClear();
    mockSend.mockResolvedValue({ data: { id: 'mock-email-id' }, error: null });
  });

  describe('sendVerificationEmail', () => {
    it('should call send with recipient address and verification subject', async () => {
      const recipientEmail = 'verify-me@example.com';
      const verificationToken = 'abc-def-123-ghi';

      await sendVerificationEmail(recipientEmail, verificationToken);

      expect(mockSend).toHaveBeenCalledWith(
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

      const callArgs = mockSend.mock.calls[0]![0]!;
      expect(callArgs.html).toContain(expectedVerificationUrl);
    });

    it('should throw an error when send rejects', async () => {
      mockSend.mockRejectedValueOnce(new Error('API error'));

      await expect(
        sendVerificationEmail('error@example.com', 'token-123')
      ).rejects.toThrow('Failed to send verification email');
    });
  });

  describe('sendPasswordResetEmail', () => {
    it('should call send with recipient address and password reset subject', async () => {
      const recipientEmail = 'reset-my-password@example.com';
      const resetToken = 'reset-token-abc-def-456';

      await sendPasswordResetEmail(recipientEmail, resetToken);

      expect(mockSend).toHaveBeenCalledWith(
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

      const callArgs = mockSend.mock.calls[0]![0]!;
      expect(callArgs.html).toContain(expectedResetUrl);
    });

    it('should throw an error when password reset email sending fails', async () => {
      mockSend.mockRejectedValueOnce(new Error('Mailbox unavailable'));

      await expect(
        sendPasswordResetEmail('fail@example.com', 'token-fail')
      ).rejects.toThrow('Failed to send password reset email');
    });

    it('should mention 1-hour expiry in the email HTML body', async () => {
      await sendPasswordResetEmail('user@example.com', 'token-expiry-check');

      const callArgs = mockSend.mock.calls[0]![0]!;
      expect(callArgs.html).toContain('1 hour');
    });
  });

  describe('sendWelcomeEmail', () => {
    it('should call send with recipient address and a welcome subject', async () => {
      const recipientEmail = 'new-verified-user@example.com';
      const userFirstName = 'Alice';

      await sendWelcomeEmail(recipientEmail, userFirstName);

      expect(mockSend).toHaveBeenCalledWith(
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

      const callArgs = mockSend.mock.calls[0]![0]!;
      expect(callArgs.html).toContain(userFirstName);
    });

    it('should not throw when welcome email sending fails - it is non-critical', async () => {
      mockSend.mockRejectedValueOnce(new Error('send failed'));

      await expect(
        sendWelcomeEmail('nothrow@example.com', 'Charlie')
      ).resolves.toBeUndefined();
    });

    it('should include the dashboard URL in the welcome email', async () => {
      await sendWelcomeEmail('dashboard@example.com', 'Dave');

      const callArgs = mockSend.mock.calls[0]![0]!;
      expect(callArgs.html).toContain('dashboard');
    });
  });
});
