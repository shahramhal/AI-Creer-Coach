import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { UserGrowthChart } from './UserGrowthChart';
import type { UserGrowthPoint } from '@/types/admin.types';

vi.mock('recharts', async () => {
  const actual = await vi.importActual<typeof import('recharts')>('recharts');
  return {
    ...actual,
    ResponsiveContainer: ({ children }: { children: React.ReactNode }) => (
      <div data-testid="responsive-container">{children}</div>
    ),
  };
});

const sampleData: UserGrowthPoint[] = [
  { date: '2026-03-01', count: 5 },
  { date: '2026-03-15', count: 12 },
  { date: '2026-03-31', count: 8 },
];

describe('UserGrowthChart - card header', () => {
  it('should render the "User Growth (30 days)" card title', () => {
    render(<UserGrowthChart data={sampleData} />);
    expect(screen.getByText('User Growth (30 days)')).toBeInTheDocument();
  });
});

describe('UserGrowthChart - chart rendering', () => {
  it('should render the chart container when data is provided', () => {
    render(<UserGrowthChart data={sampleData} />);
    expect(screen.getByTestId('responsive-container')).toBeInTheDocument();
  });

  it('should render the chart with empty data without crashing', () => {
    render(<UserGrowthChart data={[]} />);
    expect(screen.getByTestId('responsive-container')).toBeInTheDocument();
  });

  it('should render a single data point without crashing', () => {
    render(<UserGrowthChart data={[{ date: '2026-04-01', count: 3 }]} />);
    expect(screen.getByTestId('responsive-container')).toBeInTheDocument();
  });
});
