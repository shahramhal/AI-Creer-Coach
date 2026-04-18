import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { RecommendedActions } from './RecommendedActions';
import type { CV } from '@/types/cv.types';
import type { ProgressSummary } from '@/types/skillGap.types';
import type { CareerPreferences } from '@/types/settings.types';

vi.mock('next/link', () => ({
  default: ({ href, children }: { href: string; children: React.ReactNode }) => (
    <a href={href}>{children}</a>
  ),
}));

function buildCV(overrides: Partial<CV> = {}): CV {
  return {
    id: 'cv-1',
    userId: 'user-1',
    filename: 'resume.pdf',
    fileUrl: '/uploads/resume.pdf',
    parsedData: null,
    analysisData: null,
    overviewData: null,
    isPrimary: true,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

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

describe('RecommendedActions - all-set state', () => {
  it('should show the "You are all set" message when all data is healthy and no matches are pending', () => {
    const cvWithHighScore = buildCV({
      overviewData: {
        overallScore: 85,
        scoreBreakdown: { contentQuality: 85, formatStructure: 85, experienceClarity: 85, atsReadability: 85 },
        atsChecks: [],
        priorityIssues: [],
        recommendations: [],
        metadata: { wordCount: 600, sectionCount: 5 },
        analyzedAt: '2026-01-01T00:00:00.000Z',
      },
    });
    render(
      <RecommendedActions
        cvData={cvWithHighScore}
        preferences={buildPreferences()}
      />
    );
    expect(screen.getByText(/You're all set!/i)).toBeInTheDocument();
  });
});

describe('RecommendedActions - upload CV action', () => {
  it('should recommend uploading a CV when cvData is null', () => {
    render(<RecommendedActions cvData={null} />);
    expect(screen.getByText('Upload your CV')).toBeInTheDocument();
  });

  it('should link to the CV page for the upload action', () => {
    render(<RecommendedActions cvData={null} />);
    const link = screen.getByRole('link', { name: /upload cv/i });
    expect(link).toHaveAttribute('href', '/cvs');
  });
});

describe('RecommendedActions - analyze CV action', () => {
  it('should recommend analyzing the CV when cvData exists but overviewData is null', () => {
    render(<RecommendedActions cvData={buildCV({ overviewData: null })} />);
    expect(screen.getByText('Analyze your CV')).toBeInTheDocument();
  });
});

describe('RecommendedActions - set target role action', () => {
  it('should recommend setting a target role when preferences has no targetRole', () => {
    render(<RecommendedActions preferences={null} />);
    expect(screen.getByText('Set your target role')).toBeInTheDocument();
  });

  it('should link to settings for the target role action', () => {
    render(<RecommendedActions preferences={null} />);
    const link = screen.getByRole('link', { name: /settings/i });
    expect(link).toHaveAttribute('href', '/settings');
  });
});

describe('RecommendedActions - improve CV action', () => {
  it('should recommend improving the CV when overallScore is below 70', () => {
    const cvWithLowScore = buildCV({
      overviewData: {
        overallScore: 55,
        scoreBreakdown: { contentQuality: 55, formatStructure: 55, experienceClarity: 55, atsReadability: 55 },
        atsChecks: [],
        priorityIssues: [
          { severity: 'critical', title: 'Missing summary', description: 'Add a summary.', impact: 'High' },
          { severity: 'warning', title: 'Short experience', description: 'Expand entries.', impact: 'Medium' },
        ],
        recommendations: [],
        metadata: { wordCount: 200, sectionCount: 2 },
        analyzedAt: '2026-01-01T00:00:00.000Z',
      },
    });
    render(
      <RecommendedActions
        cvData={cvWithLowScore}
        preferences={buildPreferences()}
      />
    );
    expect(screen.getByText('Improve your CV')).toBeInTheDocument();
    expect(screen.getByText(/2 priority issues to fix/)).toBeInTheDocument();
  });
});

describe('RecommendedActions - learning in progress action', () => {
  it('should recommend continuing learning when there are in-progress paths', () => {
    const skillData: ProgressSummary = {
      totalPaths: 3,
      completedPaths: 1,
      inProgressPaths: 2,
      notStartedPaths: 0,
      totalEstimatedHours: 30,
      completedHours: 10,
      overallProgress: 33,
      paths: [
        {
          id: 'path-1',
          skillName: 'GraphQL',
          skillCategory: 'Backend',
          priority: 1,
          status: 'in_progress',
          progressPercentage: 40,
          estimatedHours: 10,
          startedAt: '2026-01-01T00:00:00.000Z',
          completedAt: null,
        },
      ],
    };
    render(
      <RecommendedActions
        cvData={buildCV({ overviewData: null })}
        skillData={skillData}
        preferences={buildPreferences()}
      />
    );
    expect(screen.getByText(/Continue learning GraphQL/i)).toBeInTheDocument();
  });
});

describe('RecommendedActions - job matches action', () => {
  it('should recommend reviewing job matches when matchCount is positive', () => {
    render(
      <RecommendedActions
        cvData={buildCV({ overviewData: null })}
        preferences={buildPreferences()}
        matchCount={7}
      />
    );
    expect(screen.getByText(/Review 7 job matches/i)).toBeInTheDocument();
  });
});

describe('RecommendedActions - action limit', () => {
  it('should show at most 3 actions', () => {
    const skillData: ProgressSummary = {
      totalPaths: 1,
      completedPaths: 0,
      inProgressPaths: 1,
      notStartedPaths: 0,
      totalEstimatedHours: 20,
      completedHours: 0,
      overallProgress: 0,
      paths: [
        {
          id: 'path-2',
          skillName: 'Docker',
          skillCategory: 'DevOps',
          priority: 1,
          status: 'in_progress',
          progressPercentage: 20,
          estimatedHours: 20,
          startedAt: null,
          completedAt: null,
        },
      ],
    };
    render(
      <RecommendedActions
        cvData={null}
        skillData={skillData}
        preferences={null}
        matchCount={5}
      />
    );
    // null cv = upload action, null preferences = set role action, matchCount > 0 = review matches
    // but capped at 3
    const actionItems = screen.getAllByRole('link');
    expect(actionItems.length).toBeLessThanOrEqual(3);
  });
});
