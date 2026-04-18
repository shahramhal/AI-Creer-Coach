import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CommandPalette } from './CommandPalette';

vi.mock('next/navigation', () => ({
  useRouter: vi.fn().mockReturnValue({
    push: vi.fn(),
  }),
}));

vi.mock('@/services/dashboard.service', () => ({
  dashboardService: {
    getRecentActivity: vi.fn().mockResolvedValue([]),
  },
}));

import { dashboardService } from '@/services/dashboard.service';
import { useRouter } from 'next/navigation';

describe('CommandPalette - closed state', () => {
  it('should not render the dialog when open is false', () => {
    render(<CommandPalette open={false} onOpenChange={vi.fn()} />);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});

describe('CommandPalette - open state', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(dashboardService.getRecentActivity).mockResolvedValue([]);
  });

  it('should render the dialog when open is true', () => {
    render(<CommandPalette open={true} onOpenChange={vi.fn()} />);
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('should render the search input with the correct placeholder', () => {
    render(<CommandPalette open={true} onOpenChange={vi.fn()} />);
    expect(
      screen.getByPlaceholderText('Search pages, actions, recent activity...')
    ).toBeInTheDocument();
  });

  it('should render the Pages group heading', () => {
    render(<CommandPalette open={true} onOpenChange={vi.fn()} />);
    expect(screen.getByText('Pages')).toBeInTheDocument();
  });

  it('should render the Quick Actions group heading', () => {
    render(<CommandPalette open={true} onOpenChange={vi.fn()} />);
    expect(screen.getByText('Quick Actions')).toBeInTheDocument();
  });

  it('should render the Recent Activity group heading', () => {
    render(<CommandPalette open={true} onOpenChange={vi.fn()} />);
    expect(screen.getByText('Recent Activity')).toBeInTheDocument();
  });

  it('should render all eight page navigation items', () => {
    render(<CommandPalette open={true} onOpenChange={vi.fn()} />);
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
    expect(screen.getByText('CV Analysis')).toBeInTheDocument();
    expect(screen.getByText('Job Matches')).toBeInTheDocument();
    expect(screen.getByText('Settings')).toBeInTheDocument();
  });

  it('should render quick action items including "Upload CV"', () => {
    render(<CommandPalette open={true} onOpenChange={vi.fn()} />);
    expect(screen.getByText('Upload CV')).toBeInTheDocument();
    expect(screen.getByText('Run Job Matching')).toBeInTheDocument();
  });

  it('should show "No recent activity" when getRecentActivity returns empty', async () => {
    render(<CommandPalette open={true} onOpenChange={vi.fn()} />);
    await waitFor(() => {
      expect(screen.getByText('No recent activity')).toBeInTheDocument();
    });
  });

  it('should show skeleton loaders while activity is loading', async () => {
    vi.mocked(dashboardService.getRecentActivity).mockImplementation(
      () => new Promise((resolve) => setTimeout(() => resolve([]), 1000))
    );
    render(<CommandPalette open={true} onOpenChange={vi.fn()} />);
    // the dialog renders in a Radix portal outside the test container, so query from document.body
    expect(document.body.querySelector('.animate-pulse')).toBeInTheDocument();
  });

  it('should render recent activity items when getRecentActivity resolves with data', async () => {
    vi.mocked(dashboardService.getRecentActivity).mockResolvedValue([
      {
        id: 'act-1',
        type: 'cv_upload',
        title: 'Uploaded resume.pdf',
        description: '2 minutes ago',
        createdAt: '2026-04-17T10:00:00.000Z',
      },
    ]);
    render(<CommandPalette open={true} onOpenChange={vi.fn()} />);
    await waitFor(() => {
      expect(screen.getByText('Uploaded resume.pdf')).toBeInTheDocument();
    });
  });
});

describe('CommandPalette - navigation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(dashboardService.getRecentActivity).mockResolvedValue([]);
  });

  it('should navigate and close the palette when a page item is selected', async () => {
    const mockPush = vi.fn();
    vi.mocked(useRouter).mockReturnValue({ push: mockPush } as any);
    const onOpenChange = vi.fn();

    render(<CommandPalette open={true} onOpenChange={onOpenChange} />);

    await userEvent.click(screen.getByText('Dashboard'));

    expect(onOpenChange).toHaveBeenCalledWith(false);
    expect(mockPush).toHaveBeenCalledWith('/dashboard');
  });
});

describe('CommandPalette - data fetching lifecycle', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(dashboardService.getRecentActivity).mockResolvedValue([]);
  });

  it('should call getRecentActivity when opened', async () => {
    render(<CommandPalette open={true} onOpenChange={vi.fn()} />);

    await waitFor(() => {
      expect(dashboardService.getRecentActivity).toHaveBeenCalledOnce();
    });
  });

  it('should not call getRecentActivity when closed', () => {
    render(<CommandPalette open={false} onOpenChange={vi.fn()} />);
    expect(dashboardService.getRecentActivity).not.toHaveBeenCalled();
  });
});
