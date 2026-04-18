import { render, screen } from '@testing-library/react';
import SalaryFactorBreakdown from './SalaryFactorBreakdown';
import type { SalaryFactor } from '../../types/salary.types';

let capturedXAxisFormatter: ((value: number) => string) | null = null;

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
  XAxis: ({ tickFormatter, type }: { tickFormatter?: (value: number) => string; type?: string }) => {
    if (type === 'number' && tickFormatter) {
      capturedXAxisFormatter = tickFormatter;
    }
    return <div data-testid="x-axis" data-type={type} />;
  },
  YAxis: ({ dataKey, type }: { dataKey?: string; type?: string }) => (
    <div data-testid="y-axis" data-datakey={dataKey} data-type={type} />
  ),
  Tooltip: () => <div data-testid="recharts-tooltip" />,
  Cell: ({ fill }: { fill?: string }) => <div data-testid="cell" data-fill={fill} />,
}));

beforeEach(() => {
  vi.clearAllMocks();
  capturedXAxisFormatter = null;
});

function buildFactor(factor: string, amount: number, color: string): SalaryFactor {
  return { factor, amount, color };
}

const sampleFactors: SalaryFactor[] = [
  buildFactor('Base Salary', 60000, '#6366f1'),
  buildFactor('Skills Premium', 8000, '#22c55e'),
  buildFactor('Location Bonus', 5000, '#f59e0b'),
];

describe('SalaryFactorBreakdown - rendering', () => {
  it('should render the section heading', () => {
    render(<SalaryFactorBreakdown factors={sampleFactors} currency="$" />);
    expect(screen.getByText('Salary Factor Breakdown')).toBeInTheDocument();
  });

  it('should render the chart container', () => {
    render(<SalaryFactorBreakdown factors={sampleFactors} currency="$" />);
    expect(screen.getByTestId('responsive-container')).toBeInTheDocument();
  });

  it('should render a Cell for each factor', () => {
    render(<SalaryFactorBreakdown factors={sampleFactors} currency="$" />);
    const cells = screen.getAllByTestId('cell');
    expect(cells).toHaveLength(sampleFactors.length);
  });

  it('should pass factor-specific fill color to each Cell', () => {
    render(<SalaryFactorBreakdown factors={sampleFactors} currency="$" />);
    const cells = screen.getAllByTestId('cell');
    const fillValues = cells.map((c) => c.getAttribute('data-fill'));
    expect(fillValues).toContain('#6366f1');
    expect(fillValues).toContain('#22c55e');
    expect(fillValues).toContain('#f59e0b');
  });

  it('should render YAxis with dataKey="factor" for category axis', () => {
    render(<SalaryFactorBreakdown factors={sampleFactors} currency="$" />);
    const yAxisEl = screen.getByTestId('y-axis');
    expect(yAxisEl).toHaveAttribute('data-datakey', 'factor');
    expect(yAxisEl).toHaveAttribute('data-type', 'category');
  });

  it('should render XAxis as a number type', () => {
    render(<SalaryFactorBreakdown factors={sampleFactors} currency="$" />);
    const xAxisEl = screen.getByTestId('x-axis');
    expect(xAxisEl).toHaveAttribute('data-type', 'number');
  });

  it('should render without error when given a single factor', () => {
    render(<SalaryFactorBreakdown factors={[buildFactor('Base', 50000, '#6366f1')]} currency="£" />);
    expect(screen.getByText('Salary Factor Breakdown')).toBeInTheDocument();
    expect(screen.getByTestId('responsive-container')).toBeInTheDocument();
  });

  it('should render without error for an empty factors array', () => {
    render(<SalaryFactorBreakdown factors={[]} currency="$" />);
    expect(screen.getByText('Salary Factor Breakdown')).toBeInTheDocument();
  });

  it('should render zero Cells when factors array is empty', () => {
    render(<SalaryFactorBreakdown factors={[]} currency="$" />);
    expect(screen.queryAllByTestId('cell')).toHaveLength(0);
  });
});

describe('SalaryFactorBreakdown - formatAxisTick via XAxis tickFormatter', () => {
  it('should format values >= 1000 as abbreviated with currency prefix', () => {
    render(<SalaryFactorBreakdown factors={sampleFactors} currency="£" />);
    expect(capturedXAxisFormatter).not.toBeNull();
    expect(capturedXAxisFormatter!(60000)).toBe('£60k');
  });

  it('should format values >= 1000 rounding to nearest k', () => {
    render(<SalaryFactorBreakdown factors={sampleFactors} currency="$" />);
    expect(capturedXAxisFormatter!(1500)).toBe('$2k');
  });

  it('should format values < 1000 as plain currency-prefixed number', () => {
    render(<SalaryFactorBreakdown factors={sampleFactors} currency="€" />);
    expect(capturedXAxisFormatter!(500)).toBe('€500');
  });

  it('should format value of exactly 1000 as abbreviated', () => {
    render(<SalaryFactorBreakdown factors={sampleFactors} currency="$" />);
    expect(capturedXAxisFormatter!(1000)).toBe('$1k');
  });

  it('should format value of 999 as plain number', () => {
    render(<SalaryFactorBreakdown factors={sampleFactors} currency="$" />);
    expect(capturedXAxisFormatter!(999)).toBe('$999');
  });
});

describe('SalaryFactorBreakdown - data reversal', () => {
  it('should render the same number of Cells as factors provided', () => {
    const twoFactors = [
      buildFactor('Factor A', 20000, '#111'),
      buildFactor('Factor B', 30000, '#222'),
    ];
    render(<SalaryFactorBreakdown factors={twoFactors} currency="$" />);
    expect(screen.getAllByTestId('cell')).toHaveLength(2);
  });

  it('should not mutate the original factors array', () => {
    const originalFactors = [
      buildFactor('First', 10000, '#aaa'),
      buildFactor('Second', 20000, '#bbb'),
    ];
    const factorsCopy = [...originalFactors];
    render(<SalaryFactorBreakdown factors={originalFactors} currency="$" />);
    expect(originalFactors[0].factor).toBe(factorsCopy[0].factor);
    expect(originalFactors[1].factor).toBe(factorsCopy[1].factor);
  });
});
