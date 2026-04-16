import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { cn, formatRelativeTime } from './utils';

describe('cn', () => {
  it('should join two class names', () => {
    expect(cn('foo', 'bar')).toBe('foo bar');
  });

  it('should filter out falsy values', () => {
    expect(cn('base', false && 'hidden', undefined, 'active')).toBe('base active');
  });

  it('should resolve conflicting tailwind utilities by keeping the last one', () => {
    expect(cn('p-4', 'p-8')).toBe('p-8');
  });

  it('should handle an empty call', () => {
    expect(cn()).toBe('');
  });

  it('should handle conditional object syntax', () => {
    expect(cn({ 'text-red-500': true, 'text-blue-500': false })).toBe('text-red-500');
  });
});

describe('formatRelativeTime', () => {
  let now: number;

  beforeEach(() => {
    now = Date.now();
    vi.spyOn(Date, 'now').mockReturnValue(now);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should return "just now" for a timestamp less than 60 seconds ago', () => {
    const date = new Date(now - 30 * 1000).toISOString();
    expect(formatRelativeTime(date)).toBe('just now');
  });

  it('should return "just now" for a timestamp exactly 0 seconds ago', () => {
    const date = new Date(now).toISOString();
    expect(formatRelativeTime(date)).toBe('just now');
  });

  it('should return minutes ago for a timestamp 5 minutes ago', () => {
    const date = new Date(now - 5 * 60 * 1000).toISOString();
    expect(formatRelativeTime(date)).toBe('5m ago');
  });

  it('should return minutes ago for a timestamp 59 minutes ago', () => {
    const date = new Date(now - 59 * 60 * 1000).toISOString();
    expect(formatRelativeTime(date)).toBe('59m ago');
  });

  it('should return hours ago for a timestamp 3 hours ago', () => {
    const date = new Date(now - 3 * 60 * 60 * 1000).toISOString();
    expect(formatRelativeTime(date)).toBe('3h ago');
  });

  it('should return hours ago for a timestamp 23 hours ago', () => {
    const date = new Date(now - 23 * 60 * 60 * 1000).toISOString();
    expect(formatRelativeTime(date)).toBe('23h ago');
  });

  it('should return days ago for a timestamp 10 days ago', () => {
    const date = new Date(now - 10 * 24 * 60 * 60 * 1000).toISOString();
    expect(formatRelativeTime(date)).toBe('10d ago');
  });

  it('should return days ago for a timestamp 29 days ago', () => {
    const date = new Date(now - 29 * 24 * 60 * 60 * 1000).toISOString();
    expect(formatRelativeTime(date)).toBe('29d ago');
  });

  it('should return months ago for a timestamp 45 days ago', () => {
    const date = new Date(now - 45 * 24 * 60 * 60 * 1000).toISOString();
    expect(formatRelativeTime(date)).toBe('1mo ago');
  });

  it('should return months ago for a timestamp 11 months ago', () => {
    const date = new Date(now - 330 * 24 * 60 * 60 * 1000).toISOString();
    expect(formatRelativeTime(date)).toBe('11mo ago');
  });

  it('should return years ago for a timestamp over 12 months ago', () => {
    const date = new Date(now - 400 * 24 * 60 * 60 * 1000).toISOString();
    expect(formatRelativeTime(date)).toBe('1y ago');
  });

  it('should return multiple years for a timestamp 2+ years ago', () => {
    const date = new Date(now - 800 * 24 * 60 * 60 * 1000).toISOString();
    expect(formatRelativeTime(date)).toBe('2y ago');
  });
});
