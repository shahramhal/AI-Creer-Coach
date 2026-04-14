import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import SalaryPredictionCard from './SalaryPredictionCard';
import type { SalaryPrediction } from '../../types/salary.types';

function buildSamplePrediction(overrides: Partial<SalaryPrediction> = {}): SalaryPrediction {
  return {
    jobTitle: 'Software Engineer',
    predictedSalary: 75000,
    salaryMin: 60000,
    salaryMax: 90000,
    currency: '£',
    confidence: 82,
    vsMarketAvg: 5,
    dataSource: 'adzuna',
    ...overrides,
  };
}

describe('SalaryPredictionCard', () => {
  it('should display the job title in the card', () => {
    render(<SalaryPredictionCard prediction={buildSamplePrediction()} />);
    expect(screen.getByText(/Predicted Salary for Software Engineer/)).toBeInTheDocument();
  });

  it('should display the formatted predicted salary for values over 1000', () => {
    render(<SalaryPredictionCard prediction={buildSamplePrediction({ predictedSalary: 75000, currency: '£' })} />);
    expect(screen.getByText('£75k')).toBeInTheDocument();
  });

  it('should display the salary range with min and max', () => {
    render(<SalaryPredictionCard prediction={buildSamplePrediction({ salaryMin: 60000, salaryMax: 90000, currency: '£' })} />);
    expect(screen.getByText(/£60k/)).toBeInTheDocument();
    expect(screen.getByText(/£90k/)).toBeInTheDocument();
  });

  it('should show the confidence percentage', () => {
    render(<SalaryPredictionCard prediction={buildSamplePrediction({ confidence: 82 })} />);
    expect(screen.getByText('82% confidence')).toBeInTheDocument();
  });

  it('should show the vs market average as a positive percentage', () => {
    render(<SalaryPredictionCard prediction={buildSamplePrediction({ vsMarketAvg: 5 })} />);
    expect(screen.getByText('+5%')).toBeInTheDocument();
  });

  it('should show the vs market average as a negative percentage when below market', () => {
    render(<SalaryPredictionCard prediction={buildSamplePrediction({ vsMarketAvg: -10 })} />);
    expect(screen.getByText('-10%')).toBeInTheDocument();
  });

  it('should show the vs market average label', () => {
    render(<SalaryPredictionCard prediction={buildSamplePrediction()} />);
    expect(screen.getByText('vs. market avg')).toBeInTheDocument();
  });

  it('should display the yearly suffix', () => {
    render(<SalaryPredictionCard prediction={buildSamplePrediction()} />);
    expect(screen.getByText('/year')).toBeInTheDocument();
  });

  it('should use USD currency when provided', () => {
    render(<SalaryPredictionCard prediction={buildSamplePrediction({ predictedSalary: 100000, currency: '$' })} />);
    expect(screen.getByText('$100k')).toBeInTheDocument();
  });
});
