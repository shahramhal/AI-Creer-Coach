// apps/frontend/components/dashboard/ApplicationChart.test.tsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ApplicationChart } from './ApplicationChart';
import type { ApplicationStats } from '@/types/application.types';

// Recharts uses ResizeObserver and SVG APIs that jsdom does not fully implement.
// We stub ResponsiveContainer to render its children at a fixed size so the
// rest of the chart markup is present in the DOM.
vi.mock('recharts', async () => {
  const actual = await vi.importActual<typeof import('recharts')>('recharts');
  return {
    ...actual,
    ResponsiveContainer: ({ children }: { children: React.ReactNode }) => (
      <div data-testid="responsive-container">{children}</div>
    ),
  };
});

const emptyStats: ApplicationStats = {
  total: 0,
  byStatus: { applied: 0, interview: 0, offer: 0, rejected: 0 },
  responseRate: 0,
};

const populatedStats: ApplicationStats = {
  total: 12,
  byStatus: { applied: 7, interview: 3, offer: 1, rejected: 1 },
  responseRate: 33,
};

describe('ApplicationChart', () => {
  it('should render the "Application Funnel" card title', () => {
    render(<ApplicationChart stats={emptyStats} />);

    expect(screen.getByText('Application Funnel')).toBeInTheDocument();
  });

  it('should show the loading spinner when isLoading is true', () => {
    const { container } = render(<ApplicationChart isLoading />);

    const spinner = container.querySelector('.animate-spin');
    expect(spinner).toBeInTheDocument();
  });

  it('should not show the loading spinner when isLoading is false', () => {
    const { container } = render(<ApplicationChart stats={emptyStats} isLoading={false} />);

    const spinner = container.querySelector('.animate-spin');
    expect(spinner).not.toBeInTheDocument();
  });

  it('should show the empty-state message and icon when stats has total of 0', () => {
    render(<ApplicationChart stats={emptyStats} />);

    expect(screen.getByText('No applications yet')).toBeInTheDocument();
    expect(screen.getByText('Track your applications to see conversion rates')).toBeInTheDocument();
  });

  it('should show the empty-state message when no stats prop is provided', () => {
    render(<ApplicationChart />);

    expect(screen.getByText('No applications yet')).toBeInTheDocument();
  });

  it('should render the chart container when stats has applications', () => {
    render(<ApplicationChart stats={populatedStats} />);

    expect(screen.getByTestId('responsive-container')).toBeInTheDocument();
  });

  it('should not show the empty-state message when stats has applications', () => {
    render(<ApplicationChart stats={populatedStats} />);

    expect(screen.queryByText('No applications yet')).not.toBeInTheDocument();
  });
});
