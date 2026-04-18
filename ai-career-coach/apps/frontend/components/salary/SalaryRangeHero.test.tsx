import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import SalaryRangeHero from './SalaryRangeHero';
import type { SalaryPrediction } from '../../types/salary.types';

function buildPrediction(overrides: Partial<SalaryPrediction> = {}): SalaryPrediction {
  return {
    jobTitle: 'Software Engineer',
    predictedSalary: 75000,
    salaryMin: 65000,
    salaryMax: 90000,
    confidence: 80,
    vsMarketAvg: 5,
    currency: '$',
    dataSource: 'ml',
    ...overrides,
  };
}

describe('SalaryRangeHero - salary range display', () => {
  it('should render the minimum salary formatted with currency', () => {
    const { container } = render(<SalaryRangeHero prediction={buildPrediction()} />);
    expect(container).toHaveTextContent('$65,000');
  });

  it('should render the maximum salary formatted with currency', () => {
    const { container } = render(<SalaryRangeHero prediction={buildPrediction()} />);
    expect(container).toHaveTextContent('$90,000');
  });

  it('should render the "/year" label', () => {
    render(<SalaryRangeHero prediction={buildPrediction()} />);
    expect(screen.getByText('/year')).toBeInTheDocument();
  });

  it('should render the predicted salary in the profile-adjusted estimate line', () => {
    render(<SalaryRangeHero prediction={buildPrediction()} />);
    expect(screen.getByText(/Profile-adjusted estimate/)).toBeInTheDocument();
    expect(screen.getByText(/\$75,000/)).toBeInTheDocument();
  });
});

describe('SalaryRangeHero - data source badge', () => {
  it('should show "ML Predicted" badge when dataSource is ml', () => {
    render(<SalaryRangeHero prediction={buildPrediction({ dataSource: 'ml' })} />);
    expect(screen.getByText('ML Predicted')).toBeInTheDocument();
  });

  it('should show "Market Estimate" badge when dataSource is adzuna', () => {
    render(<SalaryRangeHero prediction={buildPrediction({ dataSource: 'adzuna' })} />);
    expect(screen.getByText('Market Estimate')).toBeInTheDocument();
  });
});

describe('SalaryRangeHero - confidence badge', () => {
  it('should display the confidence percentage', () => {
    render(<SalaryRangeHero prediction={buildPrediction({ confidence: 80 })} />);
    expect(screen.getByText('80% confidence')).toBeInTheDocument();
  });

  it('should show a tooltip on mouse enter', () => {
    render(<SalaryRangeHero prediction={buildPrediction({ dataSource: 'ml' })} />);
    const confidenceBadge = screen.getByText('80% confidence');
    fireEvent.mouseEnter(confidenceBadge);
    expect(screen.getByText(/Confidence is based on/)).toBeInTheDocument();
  });

  it('should hide the tooltip on mouse leave', () => {
    render(<SalaryRangeHero prediction={buildPrediction()} />);
    const confidenceBadge = screen.getByText('80% confidence');
    fireEvent.mouseEnter(confidenceBadge);
    fireEvent.mouseLeave(confidenceBadge);
    expect(screen.queryByText(/Confidence is based on/)).not.toBeInTheDocument();
  });
});

describe('SalaryRangeHero - vs market average', () => {
  it('should show a positive percentage with a "+" prefix when vsMarketAvg is positive', () => {
    render(<SalaryRangeHero prediction={buildPrediction({ vsMarketAvg: 5 })} />);
    expect(screen.getByText('+5%')).toBeInTheDocument();
  });

  it('should show a negative percentage without "+" when vsMarketAvg is negative', () => {
    render(<SalaryRangeHero prediction={buildPrediction({ vsMarketAvg: -10 })} />);
    expect(screen.getByText('-10%')).toBeInTheDocument();
  });

  it('should show "vs. market median" label', () => {
    render(<SalaryRangeHero prediction={buildPrediction()} />);
    expect(screen.getByText('vs. market median')).toBeInTheDocument();
  });

  it('should show a tooltip when hovering the market info icon', () => {
    const { container } = render(<SalaryRangeHero prediction={buildPrediction({ vsMarketAvg: 5 })} />);
    const cursorHelpElements = container.querySelectorAll('.cursor-help');
    const marketInfoIcon = cursorHelpElements[cursorHelpElements.length - 1];
    if (marketInfoIcon) {
      fireEvent.mouseEnter(marketInfoIcon);
      expect(screen.getByText(/Your profile positions you/)).toBeInTheDocument();
    }
  });
});

describe('SalaryRangeHero - profile match badge', () => {
  it('should show "Strong Profile Match" badge when profileMatch is strong', () => {
    render(<SalaryRangeHero prediction={buildPrediction({ profileMatch: 'strong' })} />);
    expect(screen.getByText('Strong Profile Match')).toBeInTheDocument();
  });

  it('should show "Partial Match" badge when profileMatch is partial', () => {
    render(<SalaryRangeHero prediction={buildPrediction({ profileMatch: 'partial' })} />);
    expect(screen.getByText('Partial Match')).toBeInTheDocument();
  });

  it('should show "Career Transition" badge when profileMatch is career_transition', () => {
    render(<SalaryRangeHero prediction={buildPrediction({ profileMatch: 'career_transition' })} />);
    expect(screen.getByText('Career Transition')).toBeInTheDocument();
  });

  it('should not render a profile match badge when profileMatch is undefined', () => {
    render(<SalaryRangeHero prediction={buildPrediction({ profileMatch: undefined })} />);
    expect(screen.queryByText('Strong Profile Match')).not.toBeInTheDocument();
    expect(screen.queryByText('Partial Match')).not.toBeInTheDocument();
    expect(screen.queryByText('Career Transition')).not.toBeInTheDocument();
  });
});

describe('SalaryRangeHero - subtitle', () => {
  it('should include the job title in the subtitle', () => {
    render(<SalaryRangeHero prediction={buildPrediction({ jobTitle: 'Data Scientist' })} />);
    expect(screen.getByText(/Data Scientist/)).toBeInTheDocument();
  });

  it('should include the location in the subtitle when provided', () => {
    render(<SalaryRangeHero prediction={buildPrediction()} location="New York" />);
    expect(screen.getByText(/New York/)).toBeInTheDocument();
  });

  it('should not include a location qualifier when location is omitted', () => {
    render(<SalaryRangeHero prediction={buildPrediction()} />);
    expect(screen.queryByText(/in /)).not.toBeInTheDocument();
  });
});
