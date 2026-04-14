import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { ServiceHealthPanel } from './ServiceHealthPanel';

vi.mock('@/services/admin.service', () => ({
  adminService: {
    getServiceHealth: vi.fn(),
  },
}));

import { adminService } from '@/services/admin.service';

const mockAdminService = adminService as unknown as { getServiceHealth: ReturnType<typeof vi.fn> };

describe('ServiceHealthPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should show a loading indicator before data loads', () => {
    mockAdminService.getServiceHealth.mockReturnValue(new Promise(() => {}));

    render(<ServiceHealthPanel />);

    expect(screen.getByText('Loading health status...')).toBeInTheDocument();
  });

  it('should display all service labels after loading', async () => {
    mockAdminService.getServiceHealth.mockResolvedValue({
      data: {
        data: {
          postgres: true,
          mongodb: true,
          redis: false,
          mlService: true,
          jobApiService: false,
        },
      },
    });

    render(<ServiceHealthPanel />);

    await waitFor(() => {
      expect(screen.getByText('PostgreSQL')).toBeInTheDocument();
    });

    expect(screen.getByText('MongoDB')).toBeInTheDocument();
    expect(screen.getByText('Redis')).toBeInTheDocument();
    expect(screen.getByText('ML Service')).toBeInTheDocument();
    expect(screen.getByText('Job API')).toBeInTheDocument();
  });

  it('should show "Healthy" for services that are up', async () => {
    mockAdminService.getServiceHealth.mockResolvedValue({
      data: {
        data: {
          postgres: true,
          mongodb: true,
          redis: true,
          mlService: true,
          jobApiService: true,
        },
      },
    });

    render(<ServiceHealthPanel />);

    await waitFor(() => {
      const healthyLabels = screen.getAllByText('Healthy');
      expect(healthyLabels).toHaveLength(5);
    });
  });

  it('should show "Down" for services that are unhealthy', async () => {
    mockAdminService.getServiceHealth.mockResolvedValue({
      data: {
        data: {
          postgres: false,
          mongodb: false,
          redis: false,
          mlService: false,
          jobApiService: false,
        },
      },
    });

    render(<ServiceHealthPanel />);

    await waitFor(() => {
      const downLabels = screen.getAllByText('Down');
      expect(downLabels).toHaveLength(5);
    });
  });

  it('should keep the previous state when the API call fails', async () => {
    mockAdminService.getServiceHealth.mockRejectedValue(new Error('Network error'));

    render(<ServiceHealthPanel />);

    await waitFor(() => {
      expect(screen.getByText('Loading health status...')).toBeInTheDocument();
    });
  });
});
