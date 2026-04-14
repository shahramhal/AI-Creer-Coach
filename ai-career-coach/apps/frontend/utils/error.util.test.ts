import { describe, it, expect } from 'vitest';
import axios from 'axios';
import { extractErrorMessage, extractErrorCode } from './error.util';

function buildAxiosError(message?: string, code?: string, status = 400) {
  const axiosError = new axios.AxiosError(
    'Request failed',
    'ERR_BAD_REQUEST',
    undefined,
    undefined,
    {
      status,
      statusText: 'Bad Request',
      headers: {},
      config: { headers: {} } as any,
      data: {
        message,
        code,
      },
    }
  );
  return axiosError;
}

describe('extractErrorMessage', () => {
  it('should return the message from axios error response data', () => {
    const axiosError = buildAxiosError('Invalid credentials');

    const result = extractErrorMessage(axiosError);

    expect(result).toBe('Invalid credentials');
  });

  it('should return the fallback when axios error has no response message', () => {
    const axiosError = buildAxiosError(undefined);

    const result = extractErrorMessage(axiosError, 'Default fallback');

    expect(result).toBe('Default fallback');
  });

  it('should return the default fallback text when none is supplied and axios message is missing', () => {
    const axiosError = buildAxiosError(undefined);

    const result = extractErrorMessage(axiosError);

    expect(result).toBe('Something went wrong.');
  });

  it('should return the message property from a plain Error instance', () => {
    const plainError = new Error('Network failure');

    const result = extractErrorMessage(plainError);

    expect(result).toBe('Network failure');
  });

  it('should return the fallback when the error is neither axios nor Error', () => {
    const result = extractErrorMessage({ unexpected: true }, 'Fallback text');

    expect(result).toBe('Fallback text');
  });

  it('should return the default fallback for non-Error primitives', () => {
    const result = extractErrorMessage(null);

    expect(result).toBe('Something went wrong.');
  });

  it('should use the supplied fallback over the default for non-Error primitives', () => {
    const result = extractErrorMessage(42, 'Custom fallback');

    expect(result).toBe('Custom fallback');
  });
});

describe('extractErrorCode', () => {
  it('should return the error code from an axios error response', () => {
    const axiosError = buildAxiosError('Account disabled', 'ACCOUNT_DISABLED');

    const result = extractErrorCode(axiosError);

    expect(result).toBe('ACCOUNT_DISABLED');
  });

  it('should return null when the axios error has no code field', () => {
    const axiosError = buildAxiosError('Something failed', undefined);

    const result = extractErrorCode(axiosError);

    expect(result).toBeNull();
  });

  it('should return null for a plain Error instance', () => {
    const plainError = new Error('Something broke');

    const result = extractErrorCode(plainError);

    expect(result).toBeNull();
  });

  it('should return null for non-error values', () => {
    const result = extractErrorCode('just a string');

    expect(result).toBeNull();
  });

  it('should return null for null input', () => {
    const result = extractErrorCode(null);

    expect(result).toBeNull();
  });
});
