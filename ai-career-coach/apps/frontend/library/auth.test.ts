import { describe, it, expect, beforeEach } from 'vitest';
import { getAccessToken, setAccessToken, clearAccessToken } from './auth';

describe('auth token store', () => {
  beforeEach(() => {
    clearAccessToken();
  });

  describe('getAccessToken', () => {
    it('should return null when no token has been set', () => {
      expect(getAccessToken()).toBeNull();
    });

    it('should return the token after it has been set', () => {
      setAccessToken('my-token');
      expect(getAccessToken()).toBe('my-token');
    });
  });

  describe('setAccessToken', () => {
    it('should store a token retrievable via getAccessToken', () => {
      setAccessToken('jwt-abc-123');
      expect(getAccessToken()).toBe('jwt-abc-123');
    });

    it('should overwrite an existing token when called again', () => {
      setAccessToken('first-token');
      setAccessToken('second-token');
      expect(getAccessToken()).toBe('second-token');
    });

    it('should allow setting null to clear the token', () => {
      setAccessToken('some-token');
      setAccessToken(null);
      expect(getAccessToken()).toBeNull();
    });
  });

  describe('clearAccessToken', () => {
    it('should reset the stored token to null', () => {
      setAccessToken('active-token');
      clearAccessToken();
      expect(getAccessToken()).toBeNull();
    });

    it('should be safe to call when no token is currently stored', () => {
      expect(() => clearAccessToken()).not.toThrow();
      expect(getAccessToken()).toBeNull();
    });

    it('should allow setting a new token after clearing', () => {
      setAccessToken('old-token');
      clearAccessToken();
      setAccessToken('new-token');
      expect(getAccessToken()).toBe('new-token');
    });
  });
});
