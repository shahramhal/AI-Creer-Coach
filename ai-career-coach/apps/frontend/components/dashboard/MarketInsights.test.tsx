import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MarketInsights } from './MarketInsights';
import type { CareerPreferences } from '@/types/settings.types';
import type { SalaryInsightsData } from '@/types/salary.types';

vi.mock('recharts', async () => {
  const actual = await vi.importActual<typeof import('recharts')>('recharts');
  return {
    ...actual,
    ResponsiveContainer: ({ children }: { children: React.ReactNode }) => (
      <div data-testid="responsive-container">{children}</div>
    ),
  };
});

vi.mock('next/link', () => ({
  default: ({ href, children }: { href: string; children: React.ReactNode }) => (
    <a href={href}>{children}</a>
  ),
}));

function buildPreferences(overrides: Partial<CareerPreferences> = {}): CareerPreferences {
  return {
    targetRole: 'Software Engineer',
    jobTitle: 'Software Engineer',
    experienceLevel: 'mid',
    targetCompanies: [],
    country: 'GB',
    region: 'London',
    salaryMin: null,
    salaryMax: null,
    workArrangements: [],
    preferredJobTypes: [],
    ...overrides,
  };
}

function buildSalaryData(): SalaryInsightsData {
  return {
    prediction: {
      jobTitle: 'Software Engineer',
      predictedSalary: 75000,
      salaryMin: 65000,
      salaryMax: 90000,
      currency: '$',
      vsMarketAvg: 5,
      confidence: 80,
      dataSource: 'ml',
      profileMatch: 'strong',
    },
    skillROI: [
      { skill: 'React', avgSalaryIncrease: 8000, learningTime: '2 months', demandTrend: 90, priority: 'High' },
      { skill: 'TypeScript', avgSalaryIncrease: 6000, learningTime: '1 month', demandTrend: 85, priority: 'High' },
    ],
    marketTrend: [],
    regionalComparison: [],
    topPayingRoles: [],
    factorBreakdown: [],
    missingSkills: [],
  };
}

describe('MarketInsights - loading state', () => {
  it('should render the card title when loading', () => {
    render(<MarketInsights isLoading={true} />);
    expect(screen.getByText('Market Insights')).toBeInTheDocument();
  });

  it('should show animated skeleton placeholders while loading', () => {
    const { container } = render(<MarketInsights isLoading={true} />);
    const skeletons = container.querySelectorAll('.animate-pulse');
    expect(skeletons.length).toBeGreaterThan(0);
  });
});

describe('MarketInsights - no target role state', () => {
  it('should prompt the user to set a target role when preferences has no targetRole', () => {
    render(<MarketInsights isLoading={false} preferences={buildPreferences({ targetRole: '' })} />);
    expect(screen.getByText(/Set your target role/i)).toBeInTheDocument();
  });

  it('should show a link to settings when no target role is set', () => {
    render(<MarketInsights isLoading={false} preferences={buildPreferences({ targetRole: '' })} />);
    expect(screen.getByRole('link', { name: /go to settings/i })).toBeInTheDocument();
  });

  it('should show the prompt when preferences is null', () => {
    render(<MarketInsights isLoading={false} preferences={null} />);
    expect(screen.getByText(/Set your target role/i)).toBeInTheDocument();
  });
});

describe('MarketInsights - no salary data state', () => {
  it('should show an error message when salaryData is null', () => {
    render(
      <MarketInsights
        isLoading={false}
        preferences={buildPreferences()}
        salaryData={null}
      />
    );
    expect(screen.getByText(/Unable to load market insights/)).toBeInTheDocument();
  });

  it('should include the target role in the card title when salaryData is missing', () => {
    render(
      <MarketInsights
        isLoading={false}
        preferences={buildPreferences()}
        salaryData={null}
      />
    );
    expect(screen.getByText(/Market Insights: Software Engineer/)).toBeInTheDocument();
  });
});

describe('MarketInsights - populated state', () => {
  const salaryData = buildSalaryData();
  const preferences = buildPreferences();

  it('should display the predicted salary', () => {
    render(
      <MarketInsights isLoading={false} preferences={preferences} salaryData={salaryData} />
    );
    expect(screen.getByText('$75,000')).toBeInTheDocument();
  });

  it('should display the salary range', () => {
    render(
      <MarketInsights isLoading={false} preferences={preferences} salaryData={salaryData} />
    );
    expect(screen.getByText('$65,000 - $90,000')).toBeInTheDocument();
  });

  it('should show vs market average badge when vsMarketAvg is non-zero', () => {
    render(
      <MarketInsights isLoading={false} preferences={preferences} salaryData={salaryData} />
    );
    expect(screen.getByText('+5%')).toBeInTheDocument();
  });

  it('should render the chart container', () => {
    render(
      <MarketInsights isLoading={false} preferences={preferences} salaryData={salaryData} />
    );
    expect(screen.getByTestId('responsive-container')).toBeInTheDocument();
  });

  it('should show the "ML Prediction" badge for ml data source', () => {
    render(
      <MarketInsights isLoading={false} preferences={preferences} salaryData={salaryData} />
    );
    expect(screen.getByText('ML Prediction')).toBeInTheDocument();
  });

  it('should not show the vs market average row when vsMarketAvg is 0', () => {
    const flatData = buildSalaryData();
    flatData.prediction.vsMarketAvg = 0;
    render(
      <MarketInsights isLoading={false} preferences={preferences} salaryData={flatData} />
    );
    expect(screen.queryByText('vs Market Average')).not.toBeInTheDocument();
  });
});
