import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { JobDistributionChart } from './JobDistributionChart';
import type { JobStats } from '@/types/admin.types';

vi.mock('recharts', async () => {
  const actual = await vi.importActual<typeof import('recharts')>('recharts');
  return {
    ...actual,
    ResponsiveContainer: ({ children }: { children: React.ReactNode }) => (
      <div data-testid="responsive-container">{children}</div>
    ),
  };
});

function buildJobStats(overrides: Partial<JobStats> = {}): JobStats {
  return {
    totalJobs: 120,
    bySource: [
      { source: 'adzuna', count: 70 },
      { source: 'reed', count: 50 },
    ],
    byCountry: [
      { country: 'GB', count: 80 },
      { country: 'US', count: 40 },
    ],
    ...overrides,
  };
}

describe('JobDistributionChart - card header', () => {
  it('should render the "Jobs by Source" card title', () => {
    render(<JobDistributionChart data={buildJobStats()} />);
    expect(screen.getByText('Jobs by Source')).toBeInTheDocument();
  });
});

describe('JobDistributionChart - empty state', () => {
  it('should show a "No job data available" message when bySource is empty', () => {
    render(<JobDistributionChart data={buildJobStats({ bySource: [] })} />);
    expect(screen.getByText('No job data available')).toBeInTheDocument();
  });

  it('should not render the chart when bySource is empty', () => {
    render(<JobDistributionChart data={buildJobStats({ bySource: [] })} />);
    expect(screen.queryByTestId('responsive-container')).not.toBeInTheDocument();
  });
});

describe('JobDistributionChart - chart rendering', () => {
  it('should render the chart container when bySource has data', () => {
    render(<JobDistributionChart data={buildJobStats()} />);
    expect(screen.getByTestId('responsive-container')).toBeInTheDocument();
  });

  it('should not show the empty state message when there is data', () => {
    render(<JobDistributionChart data={buildJobStats()} />);
    expect(screen.queryByText('No job data available')).not.toBeInTheDocument();
  });
});
