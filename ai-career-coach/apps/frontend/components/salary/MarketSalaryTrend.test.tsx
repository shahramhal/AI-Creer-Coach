import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import MarketSalaryTrend from './MarketSalaryTrend';
import type { MarketTrendPoint } from '../../types/salary.types';

vi.mock('recharts', async () => {
  const actual = await vi.importActual<typeof import('recharts')>('recharts');
  return {
    ...actual,
    ResponsiveContainer: ({ children }: { children: React.ReactNode }) => (
      <div data-testid="responsive-container">{children}</div>
    ),
  };
});

function buildTrendPoint(year: string, salary: number): MarketTrendPoint {
  return { year, salary };
}

const sampleTrend: MarketTrendPoint[] = [
  buildTrendPoint('2024-01', 70000),
  buildTrendPoint('2024-06', 72000),
  buildTrendPoint('2025-01', 75000),
  buildTrendPoint('2025-06', 78000),
];

describe('MarketSalaryTrend - empty state', () => {
  it('should render the section heading even when trend is empty', () => {
    render(<MarketSalaryTrend trend={[]} currency="$" />);
    expect(screen.getByText('Market Salary Trend')).toBeInTheDocument();
  });

  it('should show "No historical data available" when trend array is empty', () => {
    render(<MarketSalaryTrend trend={[]} currency="$" />);
    expect(screen.getByText('No historical data available')).toBeInTheDocument();
  });

  it('should not render a chart when trend is empty', () => {
    render(<MarketSalaryTrend trend={[]} currency="$" />);
    expect(screen.queryByTestId('responsive-container')).not.toBeInTheDocument();
  });
});

describe('MarketSalaryTrend - populated state', () => {
  it('should render the section heading', () => {
    render(<MarketSalaryTrend trend={sampleTrend} currency="$" />);
    expect(screen.getByText('Market Salary Trend')).toBeInTheDocument();
  });

  it('should render the subtitle', () => {
    render(<MarketSalaryTrend trend={sampleTrend} currency="$" />);
    expect(screen.getByText('Historical salary trend')).toBeInTheDocument();
  });

  it('should render the chart container', () => {
    render(<MarketSalaryTrend trend={sampleTrend} currency="$" />);
    expect(screen.getByTestId('responsive-container')).toBeInTheDocument();
  });

  it('should render the year filter select with "All years" default', () => {
    render(<MarketSalaryTrend trend={sampleTrend} currency="$" />);
    expect(screen.getByRole('combobox')).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'All years' })).toBeInTheDocument();
  });

  it('should render an option for each unique year in the trend data', () => {
    render(<MarketSalaryTrend trend={sampleTrend} currency="$" />);
    expect(screen.getByRole('option', { name: '2024' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: '2025' })).toBeInTheDocument();
  });

  it('should allow the user to select a specific year', async () => {
    render(<MarketSalaryTrend trend={sampleTrend} currency="$" />);
    const yearSelect = screen.getByRole('combobox');
    await userEvent.selectOptions(yearSelect, '2024');
    expect((yearSelect as HTMLSelectElement).value).toBe('2024');
  });

  it('should allow the user to switch back to "All years"', async () => {
    render(<MarketSalaryTrend trend={sampleTrend} currency="$" />);
    const yearSelect = screen.getByRole('combobox');
    await userEvent.selectOptions(yearSelect, '2025');
    await userEvent.selectOptions(yearSelect, 'all');
    expect((yearSelect as HTMLSelectElement).value).toBe('all');
  });
});

describe('MarketSalaryTrend - single year data', () => {
  const singleYearTrend: MarketTrendPoint[] = [
    buildTrendPoint('2025-01', 70000),
    buildTrendPoint('2025-06', 73000),
  ];

  it('should render one year option when all data is in the same year', () => {
    render(<MarketSalaryTrend trend={singleYearTrend} currency="£" />);
    const yearOptions = screen.getAllByRole('option');
    expect(yearOptions).toHaveLength(2);
  });
});
