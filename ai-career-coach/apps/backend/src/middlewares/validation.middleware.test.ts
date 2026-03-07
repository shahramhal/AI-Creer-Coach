// apps/backend/src/middlewares/validation.middleware.test.ts
import { describe, it, expect, vi } from 'vitest';
import express from 'express';
import request from 'supertest';
import {
  registerValidation,
  loginValidation,
  forgotPasswordValidation,
  resetPasswordValidation,
} from './validation.middleware.js';
import { validationResult } from 'express-validator';

// Build a minimal test Express app that applies validation and reports errors
function buildValidationTestApp(
  validationChain: any[]
): express.Application {
  const testApp = express();
  testApp.use(express.json());

  testApp.post('/test', validationChain, (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array(),
      });
    }
    return res.status(200).json({ success: true });
  });

  return testApp;
}

describe('registerValidation middleware', () => {
  const testApp = buildValidationTestApp(registerValidation);

  it('should pass validation when all required fields are valid', async () => {
    const validRegistrationPayload = {
      email: 'newuser@example.com',
      password: 'SecurePass123',
      firstName: 'Alice',
      lastName: 'Smith',
    };

    const response = await request(testApp)
      .post('/test')
      .send(validRegistrationPayload);

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
  });

  it('should fail validation when email is not a valid email address', async () => {
    const invalidEmailPayload = {
      email: 'not-an-email-address',
      password: 'SecurePass123',
    };

    const response = await request(testApp)
      .post('/test')
      .send(invalidEmailPayload);

    expect(response.status).toBe(400);
    expect(response.body.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ msg: 'Please provide a valid email' }),
      ])
    );
  });

  it('should fail validation when password is shorter than 8 characters', async () => {
    const shortPasswordPayload = {
      email: 'user@example.com',
      password: 'Sh0rt',
    };

    const response = await request(testApp)
      .post('/test')
      .send(shortPasswordPayload);

    expect(response.status).toBe(400);
    expect(response.body.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ msg: 'Password must be at least 8 characters' }),
      ])
    );
  });

  it('should fail validation when password lacks uppercase, lowercase, or digit', async () => {
    const weakPasswordPayload = {
      email: 'user@example.com',
      password: 'alllowercase',
    };

    const response = await request(testApp)
      .post('/test')
      .send(weakPasswordPayload);

    expect(response.status).toBe(400);
    expect(response.body.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ msg: 'Password must contain uppercase, lowercase, and number' }),
      ])
    );
  });

  it('should fail validation when firstName exceeds 50 characters', async () => {
    const longFirstNamePayload = {
      email: 'user@example.com',
      password: 'SecurePass123',
      firstName: 'A'.repeat(51),
    };

    const response = await request(testApp)
      .post('/test')
      .send(longFirstNamePayload);

    expect(response.status).toBe(400);
    expect(response.body.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ msg: 'First name must be between 1 and 50 characters' }),
      ])
    );
  });

  it('should pass validation when optional firstName and lastName are omitted', async () => {
    const minimalRegistrationPayload = {
      email: 'minimal@example.com',
      password: 'MinimalPass1',
    };

    const response = await request(testApp)
      .post('/test')
      .send(minimalRegistrationPayload);

    expect(response.status).toBe(200);
  });
});

describe('loginValidation middleware', () => {
  const testApp = buildValidationTestApp(loginValidation);

  it('should pass validation with valid email and password fields', async () => {
    const validLoginPayload = {
      email: 'user@example.com',
      password: 'anyPasswordValue',
    };

    const response = await request(testApp)
      .post('/test')
      .send(validLoginPayload);

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
  });

  it('should fail validation when email field is not a valid email address', async () => {
    const invalidEmailLoginPayload = {
      email: 'not-valid-email',
      password: 'anyPassword',
    };

    const response = await request(testApp)
      .post('/test')
      .send(invalidEmailLoginPayload);

    expect(response.status).toBe(400);
    expect(response.body.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ msg: 'Please provide a valid email' }),
      ])
    );
  });

  it('should fail validation when password field is empty', async () => {
    const emptyPasswordPayload = {
      email: 'user@example.com',
      password: '',
    };

    const response = await request(testApp)
      .post('/test')
      .send(emptyPasswordPayload);

    expect(response.status).toBe(400);
    expect(response.body.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ msg: 'Password is required' }),
      ])
    );
  });
});

describe('forgotPasswordValidation middleware', () => {
  const testApp = buildValidationTestApp(forgotPasswordValidation);

  it('should pass validation when a valid email address is provided', async () => {
    const validForgotPasswordPayload = { email: 'user@example.com' };

    const response = await request(testApp)
      .post('/test')
      .send(validForgotPasswordPayload);

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
  });

  it('should fail validation when email is invalid format', async () => {
    const invalidEmailForgotPasswordPayload = { email: 'definitely-not-an-email' };

    const response = await request(testApp)
      .post('/test')
      .send(invalidEmailForgotPasswordPayload);

    expect(response.status).toBe(400);
    expect(response.body.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ msg: 'Please provide a valid email' }),
      ])
    );
  });
});

describe('resetPasswordValidation middleware', () => {
  const testApp = buildValidationTestApp(resetPasswordValidation);

  it('should pass validation with a valid reset token and compliant password', async () => {
    const validResetPasswordPayload = {
      token: 'valid-reset-token-string',
      password: 'NewSecurePass1',
    };

    const response = await request(testApp)
      .post('/test')
      .send(validResetPasswordPayload);

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
  });

  it('should fail validation when the reset token field is empty', async () => {
    const missingTokenPayload = {
      token: '',
      password: 'NewSecurePass1',
    };

    const response = await request(testApp)
      .post('/test')
      .send(missingTokenPayload);

    expect(response.status).toBe(400);
    expect(response.body.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ msg: 'Reset token is required' }),
      ])
    );
  });

  it('should fail validation when the new password does not meet complexity requirements', async () => {
    const weakNewPasswordPayload = {
      token: 'valid-reset-token',
      password: 'weakpass',
    };

    const response = await request(testApp)
      .post('/test')
      .send(weakNewPasswordPayload);

    expect(response.status).toBe(400);
    expect(response.body.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ msg: 'Password must contain uppercase, lowercase, and number' }),
      ])
    );
  });
});
