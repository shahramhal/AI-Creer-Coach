import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ATSScoreCard from './ATSScoreCard';
import type { ATSScoreData } from '../../types/cv.types';

const buildAtsData = (overrides: Partial<ATSScoreData> = {}): ATSScoreData => ({
  atsScore: 72,
  breakdown: {
    keywordMatch: 80,
    semanticSimilarity: 65,
    skillsCoverage: 70,
  },
  keywordsMatched: [{ keyword: 'TypeScript', frequency: 3 }],
  keywordsMissing: [{ keyword: 'Docker', importance: 'high', suggestion: 'Add Docker experience' }],
  suggestions: ['Highlight TypeScript experience more prominently'],
  ...overrides,
} as ATSScoreData);

describe('ATSScoreCard', () => {
  const onCalculate = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render the "Calculate ATS Score" button when atsData is null', () => {
    render(
      <ATSScoreCard applicationId="app-1" atsData={null} onCalculate={onCalculate} />
    );
    expect(
      screen.getByRole('button', { name: /calculate ats score/i })
    ).toBeInTheDocument();
  });

  it('should call onCalculate with the applicationId when the button is clicked', async () => {
    onCalculate.mockResolvedValue(undefined);
    render(
      <ATSScoreCard applicationId="app-xyz" atsData={null} onCalculate={onCalculate} />
    );

    await userEvent.click(screen.getByRole('button', { name: /calculate ats score/i }));

    await waitFor(() => {
      expect(onCalculate).toHaveBeenCalledWith('app-xyz');
    });
  });

  it('should show a loading spinner while calculation is in progress', async () => {
    onCalculate.mockReturnValue(new Promise(() => {}));
    render(
      <ATSScoreCard applicationId="app-1" atsData={null} onCalculate={onCalculate} />
    );

    await userEvent.click(screen.getByRole('button', { name: /calculate ats score/i }));

    expect(screen.getByText('Calculating...')).toBeInTheDocument();
  });

  it('should display the ATS score when data is available', () => {
    render(
      <ATSScoreCard applicationId="app-1" atsData={buildAtsData({ atsScore: 85 })} onCalculate={onCalculate} />
    );
    expect(screen.getByText('85')).toBeInTheDocument();
  });

  it('should show Score Breakdown section with labels', () => {
    render(
      <ATSScoreCard applicationId="app-1" atsData={buildAtsData()} onCalculate={onCalculate} />
    );
    expect(screen.getByText('Keyword Match')).toBeInTheDocument();
    expect(screen.getByText('Semantic Similarity')).toBeInTheDocument();
    expect(screen.getByText('Skills Coverage')).toBeInTheDocument();
  });

  it('should display matched keywords', () => {
    render(
      <ATSScoreCard applicationId="app-1" atsData={buildAtsData()} onCalculate={onCalculate} />
    );
    expect(screen.getByText('TypeScript')).toBeInTheDocument();
    expect(screen.getByText(/Matched Keywords \(1\)/i)).toBeInTheDocument();
  });

  it('should display missing keywords', () => {
    render(
      <ATSScoreCard applicationId="app-1" atsData={buildAtsData()} onCalculate={onCalculate} />
    );
    expect(screen.getByText('Docker')).toBeInTheDocument();
    expect(screen.getByText(/Missing Keywords \(1\)/i)).toBeInTheDocument();
  });

  it('should display suggestions', () => {
    render(
      <ATSScoreCard applicationId="app-1" atsData={buildAtsData()} onCalculate={onCalculate} />
    );
    expect(
      screen.getByText('Highlight TypeScript experience more prominently')
    ).toBeInTheDocument();
  });

  it('should show the "Recalculate" button when atsData is present', () => {
    render(
      <ATSScoreCard applicationId="app-1" atsData={buildAtsData()} onCalculate={onCalculate} />
    );
    expect(screen.getByRole('button', { name: /recalculate/i })).toBeInTheDocument();
  });

  it('should not show matched keywords section when list is empty', () => {
    render(
      <ATSScoreCard
        applicationId="app-1"
        atsData={buildAtsData({ keywordsMatched: [] })}
        onCalculate={onCalculate}
      />
    );
    expect(screen.queryByText(/Matched Keywords/i)).not.toBeInTheDocument();
  });
});
