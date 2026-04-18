import { vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import SalaryByLocation from './SalaryByLocation';
import type { RegionalSalary } from '../../types/salary.types';

let capturedYAxisFormatter: ((value: number) => string) | null = null;

vi.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="responsive-container">{children}</div>
  ),
  BarChart: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="bar-chart">{children}</div>
  ),
  Bar: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="bar">{children}</div>
  ),
  XAxis: ({ dataKey }: { dataKey?: string }) => (
    <div data-testid="x-axis" data-datakey={dataKey} />
  ),
  YAxis: ({ tickFormatter }: { tickFormatter?: (value: number) => string }) => {
    capturedYAxisFormatter = tickFormatter ?? null;
    return <div data-testid="y-axis" />;
  },
  Tooltip: () => <div data-testid="recharts-tooltip" />,
  Cell: ({ fill }: { fill?: string }) => <div data-testid="cell" data-fill={fill} />,
}));

beforeEach(() => {
  vi.clearAllMocks();
  capturedYAxisFormatter = null;
});

function buildRegion(location: string, salary: number): RegionalSalary {
  return { location, salary };
}

const sampleRegions: RegionalSalary[] = [
  buildRegion('London', 90000),
  buildRegion('Manchester', 70000),
  buildRegion('Edinburgh', 72000),
];

describe('SalaryByLocation - empty state', () => {
  it('should render the section heading when regions is empty', () => {
    render(<SalaryByLocation regions={[]} currency="£" />);
    expect(screen.getByText('Salary by Cities')).toBeInTheDocument();
  });

  it('should show "No regional data available" when regions is empty', () => {
    render(<SalaryByLocation regions={[]} currency="£" />);
    expect(screen.getByText('No regional data available')).toBeInTheDocument();
  });

  it('should not render a chart when regions is empty', () => {
    render(<SalaryByLocation regions={[]} currency="£" />);
    expect(screen.queryByTestId('responsive-container')).not.toBeInTheDocument();
  });
});

describe('SalaryByLocation - populated state', () => {
  it('should render the section heading', () => {
    render(<SalaryByLocation regions={sampleRegions} currency="£" />);
    expect(screen.getByText('Salary by Cities')).toBeInTheDocument();
  });

  it('should render the chart container', () => {
    render(<SalaryByLocation regions={sampleRegions} currency="£" />);
    expect(screen.getByTestId('responsive-container')).toBeInTheDocument();
  });

  it('should not show the empty state message when regions are provided', () => {
    render(<SalaryByLocation regions={sampleRegions} currency="£" />);
    expect(screen.queryByText('No regional data available')).not.toBeInTheDocument();
  });

  it('should render a Cell for each region', () => {
    render(<SalaryByLocation regions={sampleRegions} currency="£" />);
    const cells = screen.getAllByTestId('cell');
    expect(cells).toHaveLength(sampleRegions.length);
  });

  it('should pass "location" as dataKey to XAxis', () => {
    render(<SalaryByLocation regions={sampleRegions} currency="$" />);
    expect(screen.getByTestId('x-axis')).toHaveAttribute('data-datakey', 'location');
  });
});

describe('SalaryByLocation - single region', () => {
  it('should render without error for a single region', () => {
    render(<SalaryByLocation regions={[buildRegion('New York', 110000)]} currency="$" />);
    expect(screen.getByText('Salary by Cities')).toBeInTheDocument();
    expect(screen.getByTestId('responsive-container')).toBeInTheDocument();
  });

  it('should render one Cell for a single region', () => {
    render(<SalaryByLocation regions={[buildRegion('New York', 110000)]} currency="$" />);
    expect(screen.getAllByTestId('cell')).toHaveLength(1);
  });
});

describe('SalaryByLocation - formatAxisTick via YAxis tickFormatter', () => {
  it('should format values >= 1000 as abbreviated with currency prefix', () => {
    render(<SalaryByLocation regions={sampleRegions} currency="£" />);
    expect(capturedYAxisFormatter).not.toBeNull();
    expect(capturedYAxisFormatter!(90000)).toBe('£90k');
  });

  it('should format values >= 1000 rounding to nearest k', () => {
    render(<SalaryByLocation regions={sampleRegions} currency="$" />);
    expect(capturedYAxisFormatter!(1500)).toBe('$2k');
  });

  it('should format values < 1000 as plain currency-prefixed number', () => {
    render(<SalaryByLocation regions={sampleRegions} currency="€" />);
    expect(capturedYAxisFormatter!(500)).toBe('€500');
  });

  it('should format value of exactly 1000 as abbreviated', () => {
    render(<SalaryByLocation regions={sampleRegions} currency="$" />);
    expect(capturedYAxisFormatter!(1000)).toBe('$1k');
  });

  it('should format value of 999 as plain number', () => {
    render(<SalaryByLocation regions={sampleRegions} currency="$" />);
    expect(capturedYAxisFormatter!(999)).toBe('$999');
  });
});
