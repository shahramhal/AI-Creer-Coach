import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import CVAnalysisTabs from './CVAnalysisTabs';
import type { AnalysisData, CVOverviewData } from '../../types/cv.types';

vi.mock('./OverviewTab', () => ({
  default: ({ data }: { data: unknown }) => (
    <div data-testid="overview-tab">OverviewTab score={JSON.stringify(data)}</div>
  ),
}));

vi.mock('./RecommendationsTab', () => ({
  default: ({ recommendations }: { recommendations: unknown[] }) => (
    <div data-testid="recommendations-tab">
      RecommendationsTab count={recommendations.length}
    </div>
  ),
}));

const sampleOverviewData: CVOverviewData = {
  overallScore: 74,
  scoreBreakdown: {
    contentQuality: 70,
    formatStructure: 75,
    experienceClarity: 72,
    atsReadability: 79,
  },
  atsChecks: [],
  priorityIssues: [],
  recommendations: [],
  metadata: { wordCount: 350, sectionCount: 4 },
  analyzedAt: '2026-03-01T00:00:00.000Z',
};

const sampleAnalysisData: AnalysisData = {
  overallScore: 60,
  scoreBreakdown: {
    contentQuality: 60,
    atsCompatibility: 55,
    keywordsMatch: 65,
    formatStructure: 60,
    experienceClarity: 60,
  },
  priorityIssues: [],
  atsAnalysis: [],
  missingKeywords: [],
  recommendations: [],
  analyzedAt: '2026-02-01T00:00:00.000Z',
};

describe('CVAnalysisTabs - no data state', () => {
  it('should show the "Analyze Your CV" CTA when no data is provided', () => {
    render(
      <CVAnalysisTabs
        analysisData={null}
        overviewData={null}
        isAnalyzing={false}
        onAnalyze={vi.fn()}
      />
    );
    expect(screen.getByText('Analyze Your CV')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /analyze cv/i })).toBeInTheDocument();
  });

  it('should call onAnalyze when the CTA button is clicked', async () => {
    const onAnalyze = vi.fn();
    render(
      <CVAnalysisTabs
        analysisData={null}
        overviewData={null}
        isAnalyzing={false}
        onAnalyze={onAnalyze}
      />
    );
    await userEvent.click(screen.getByRole('button', { name: /analyze cv/i }));
    expect(onAnalyze).toHaveBeenCalledOnce();
  });

  it('should show "Analyzing..." and disable the button when isAnalyzing is true', () => {
    render(
      <CVAnalysisTabs
        analysisData={null}
        overviewData={null}
        isAnalyzing={true}
        onAnalyze={vi.fn()}
      />
    );
    expect(screen.getByRole('button', { name: /analyzing/i })).toBeDisabled();
  });
});

describe('CVAnalysisTabs - with data', () => {
  it('should render the Overview and Recommendations tabs when overviewData is provided', () => {
    render(
      <CVAnalysisTabs
        analysisData={null}
        overviewData={sampleOverviewData}
        isAnalyzing={false}
        onAnalyze={vi.fn()}
      />
    );
    expect(screen.getByRole('tab', { name: 'Overview' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Recommendations' })).toBeInTheDocument();
  });

  it('should show the OverviewTab by default', () => {
    render(
      <CVAnalysisTabs
        analysisData={null}
        overviewData={sampleOverviewData}
        isAnalyzing={false}
        onAnalyze={vi.fn()}
      />
    );
    expect(screen.getByTestId('overview-tab')).toBeInTheDocument();
  });

  it('should switch to the RecommendationsTab when its tab trigger is clicked', async () => {
    render(
      <CVAnalysisTabs
        analysisData={null}
        overviewData={sampleOverviewData}
        isAnalyzing={false}
        onAnalyze={vi.fn()}
      />
    );
    await userEvent.click(screen.getByRole('tab', { name: 'Recommendations' }));
    expect(screen.getByTestId('recommendations-tab')).toBeInTheDocument();
  });

  it('should prefer overviewData over analysisData when both are present', () => {
    render(
      <CVAnalysisTabs
        analysisData={sampleAnalysisData}
        overviewData={sampleOverviewData}
        isAnalyzing={false}
        onAnalyze={vi.fn()}
      />
    );
    const overviewContent = screen.getByTestId('overview-tab').textContent ?? '';
    expect(overviewContent).toContain('74');
  });

  it('should fall back to analysisData when overviewData is null', () => {
    render(
      <CVAnalysisTabs
        analysisData={sampleAnalysisData}
        overviewData={null}
        isAnalyzing={false}
        onAnalyze={vi.fn()}
      />
    );
    expect(screen.getByTestId('overview-tab')).toBeInTheDocument();
    const overviewContent = screen.getByTestId('overview-tab').textContent ?? '';
    expect(overviewContent).toContain('60');
  });
});
