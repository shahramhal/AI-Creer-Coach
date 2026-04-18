import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import OverviewTab from './OverviewTab';
import type { CVOverviewData, AnalysisData } from '../../types/cv.types';

const sampleOverviewData: CVOverviewData = {
  overallScore: 77,
  scoreBreakdown: {
    contentQuality: 80,
    formatStructure: 75,
    experienceClarity: 70,
    atsReadability: 83,
  },
  atsChecks: [],
  priorityIssues: [
    {
      severity: 'critical',
      title: 'Too short',
      description: 'Your CV is under 300 words.',
      impact: 'High',
    },
    {
      severity: 'warning',
      title: 'Weak action verbs',
      description: 'Use stronger action verbs.',
      impact: 'Medium',
    },
    {
      severity: 'suggestion',
      title: 'Add a summary',
      description: 'A professional summary helps recruiters.',
      impact: 'Low',
    },
  ],
  recommendations: [],
  metadata: { wordCount: 250, sectionCount: 3 },
  analyzedAt: '2026-03-15T00:00:00.000Z',
};

const emptyIssuesData: CVOverviewData = {
  ...sampleOverviewData,
  priorityIssues: [],
};

describe('OverviewTab - score breakdown', () => {
  it('should render the "Score Breakdown" card', () => {
    render(<OverviewTab data={sampleOverviewData} />);
    expect(screen.getByText('Score Breakdown')).toBeInTheDocument();
  });

  it('should display the human-readable label for contentQuality', () => {
    render(<OverviewTab data={sampleOverviewData} />);
    expect(screen.getByText('Content Quality')).toBeInTheDocument();
  });

  it('should display score values for each breakdown category', () => {
    render(<OverviewTab data={sampleOverviewData} />);
    expect(screen.getByText('80/100')).toBeInTheDocument();
    expect(screen.getByText('75/100')).toBeInTheDocument();
    expect(screen.getByText('70/100')).toBeInTheDocument();
    expect(screen.getByText('83/100')).toBeInTheDocument();
  });

  it('should display the legacy atsCompatibility label when present in analysisData', () => {
    const analysisData: AnalysisData = {
      overallScore: 65,
      scoreBreakdown: {
        contentQuality: 65,
        atsCompatibility: 60,
        keywordsMatch: 70,
        formatStructure: 65,
        experienceClarity: 65,
      },
      priorityIssues: [],
      atsAnalysis: [],
      missingKeywords: [],
      recommendations: [],
      analyzedAt: '2026-01-01T00:00:00.000Z',
    };
    render(<OverviewTab data={analysisData} />);
    expect(screen.getByText('ATS Compatibility')).toBeInTheDocument();
    expect(screen.getByText('Keywords Match')).toBeInTheDocument();
  });
});

describe('OverviewTab - priority issues', () => {
  it('should render the "Priority Issues" card', () => {
    render(<OverviewTab data={sampleOverviewData} />);
    expect(screen.getByText('Priority Issues')).toBeInTheDocument();
  });

  it('should show a "No critical issues" message when priorityIssues is empty', () => {
    render(<OverviewTab data={emptyIssuesData} />);
    expect(screen.getByText('No critical issues found. Great job!')).toBeInTheDocument();
  });

  it('should render each priority issue title', () => {
    render(<OverviewTab data={sampleOverviewData} />);
    expect(screen.getByText('Too short')).toBeInTheDocument();
    expect(screen.getByText('Weak action verbs')).toBeInTheDocument();
    expect(screen.getByText('Add a summary')).toBeInTheDocument();
  });

  it('should render each priority issue description', () => {
    render(<OverviewTab data={sampleOverviewData} />);
    expect(screen.getByText('Your CV is under 300 words.')).toBeInTheDocument();
  });

  it('should render the impact badge for each issue', () => {
    render(<OverviewTab data={sampleOverviewData} />);
    expect(screen.getByText('High')).toBeInTheDocument();
    expect(screen.getByText('Medium')).toBeInTheDocument();
    expect(screen.getByText('Low')).toBeInTheDocument();
  });

  it('should render three issue rows for three priority issues', () => {
    render(<OverviewTab data={sampleOverviewData} />);
    const issueTitles = ['Too short', 'Weak action verbs', 'Add a summary'];
    issueTitles.forEach((title) => {
      expect(screen.getByText(title)).toBeInTheDocument();
    });
  });
});
