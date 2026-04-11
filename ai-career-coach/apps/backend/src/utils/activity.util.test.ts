import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PrismaClient } from '@prisma/client';

const mockPrismaInstance = new PrismaClient() as any;

describe('logUserActivity', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('calls prisma.userActivity.create with the correct data', async () => {
    mockPrismaInstance.userActivity.create.mockResolvedValue({ id: 'act-1' });

    const { logUserActivity } = await import('./activity.util.js');
    logUserActivity('user-123', 'CV_UPLOAD', 'Uploaded CV', 'User uploaded a new CV');

    // Fire-and-forget: allow the microtask to settle
    await Promise.resolve();

    expect(mockPrismaInstance.userActivity.create).toHaveBeenCalledWith({
      data: {
        userId: 'user-123',
        type: 'CV_UPLOAD',
        title: 'Uploaded CV',
        description: 'User uploaded a new CV',
      },
    });
  });

  it('silently catches errors from prisma.userActivity.create', async () => {
    mockPrismaInstance.userActivity.create.mockRejectedValue(new Error('DB error'));

    const { logUserActivity } = await import('./activity.util.js');

    expect(() => {
      logUserActivity('user-xyz', 'LOGIN', 'User logged in', 'Successful login');
    }).not.toThrow();

    // Allow rejection handler to run
    await new Promise(resolve => setTimeout(resolve, 0));
  });
});
