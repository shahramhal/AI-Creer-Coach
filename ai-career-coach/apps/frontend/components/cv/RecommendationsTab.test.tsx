import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import RecommendationsTab from './RecommendationsTab';
import type { Recommendation } from '../../types/cv.types';

const highImpactRec: Recommendation = {
  priority: 1,
  title: 'Add quantified achievements',
  description: 'Include numbers and metrics to show impact.',
  impact: 'High Impact',
  timeEstimate: '30 min',
  impactRate: '+15%',
};

const mediumImpactRec: Recommendation = {
  priority: 2,
  title: 'Improve your summary',
  description: 'Write a concise professional summary at the top.',
  impact: 'Medium Impact',
  timeEstimate: '20 min',
  impactRate: '+8%',
};

const lowImpactRec: Recommendation = {
  priority: 3,
  title: 'Add a LinkedIn URL',
  description: 'Link to your LinkedIn profile for credibility.',
  impact: 'Low Impact',
  timeEstimate: '5 min',
  impactRate: '+3%',
};

describe('RecommendationsTab - heading', () => {
  it('should render the section heading', () => {
    render(<RecommendationsTab recommendations={[]} />);
    expect(screen.getByText('Prioritized Recommendations')).toBeInTheDocument();
  });
});

describe('RecommendationsTab - empty state', () => {
  it('should show a "no recommendations" message when the list is empty', () => {
    render(<RecommendationsTab recommendations={[]} />);
    expect(screen.getByText(/No recommendations at this time/)).toBeInTheDocument();
  });
});

describe('RecommendationsTab - recommendation items', () => {
  it('should render the title and description for a recommendation', () => {
    render(<RecommendationsTab recommendations={[highImpactRec]} />);
    expect(screen.getByText('Add quantified achievements')).toBeInTheDocument();
    expect(screen.getByText('Include numbers and metrics to show impact.')).toBeInTheDocument();
  });

  it('should display the priority number for each recommendation', () => {
    render(<RecommendationsTab recommendations={[highImpactRec, mediumImpactRec]} />);
    expect(screen.getByText('1')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
  });

  it('should display the impact badge with the correct label', () => {
    render(<RecommendationsTab recommendations={[highImpactRec, mediumImpactRec, lowImpactRec]} />);
    expect(screen.getByText('High Impact')).toBeInTheDocument();
    expect(screen.getByText('Medium Impact')).toBeInTheDocument();
    expect(screen.getByText('Low Impact')).toBeInTheDocument();
  });

  it('should display the time estimate and impact rate metadata', () => {
    render(<RecommendationsTab recommendations={[highImpactRec]} />);
    expect(screen.getByText('30 min')).toBeInTheDocument();
    expect(screen.getByText('+15%')).toBeInTheDocument();
  });

  it('should render all three recommendations', () => {
    render(<RecommendationsTab recommendations={[highImpactRec, mediumImpactRec, lowImpactRec]} />);
    expect(screen.getByText('Add quantified achievements')).toBeInTheDocument();
    expect(screen.getByText('Improve your summary')).toBeInTheDocument();
    expect(screen.getByText('Add a LinkedIn URL')).toBeInTheDocument();
  });
});

describe('RecommendationsTab - impact styling', () => {
  it('should apply the destructive color class for a High Impact badge', () => {
    const { container } = render(<RecommendationsTab recommendations={[highImpactRec]} />);
    const impactBadge = container.querySelector('.text-destructive');
    expect(impactBadge).toBeInTheDocument();
  });

  it('should apply the warning color class for a Medium Impact badge', () => {
    const { container } = render(<RecommendationsTab recommendations={[mediumImpactRec]} />);
    const impactBadge = container.querySelector('.text-warning');
    expect(impactBadge).toBeInTheDocument();
  });
});
