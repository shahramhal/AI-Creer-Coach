import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import ProgressTracker from './ProgressTracker';
import type { ProgressSummary } from '../../types/skillGap.types';

const buildSummary = (overrides: Partial<ProgressSummary> = {}): ProgressSummary => ({
  totalPaths: 5,
  completedPaths: 2,
  inProgressPaths: 2,
  notStartedPaths: 1,
  overallProgress: 40,
  completedHours: 60,
  totalEstimatedHours: 150,
  paths: [],
  ...overrides,
});

describe('ProgressTracker', () => {
  it('should render the total paths stat', () => {
    render(<ProgressTracker summary={buildSummary({ totalPaths: 8 })} />);
    expect(screen.getByText('Total Paths')).toBeInTheDocument();
    expect(screen.getByText('8')).toBeInTheDocument();
  });

  it('should render the completed paths stat', () => {
    render(<ProgressTracker summary={buildSummary({ completedPaths: 3 })} />);
    expect(screen.getByText('Completed')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
  });

  it('should render the in-progress stat', () => {
    render(<ProgressTracker summary={buildSummary({ inProgressPaths: 1 })} />);
    expect(screen.getByText('In Progress')).toBeInTheDocument();
    expect(screen.getByText('1')).toBeInTheDocument();
  });

  it('should render the completed hours stat', () => {
    render(<ProgressTracker summary={buildSummary({ completedHours: 45 })} />);
    expect(screen.getByText('Hours Done')).toBeInTheDocument();
    expect(screen.getByText('45')).toBeInTheDocument();
  });

  it('should render the overall progress percentage', () => {
    render(<ProgressTracker summary={buildSummary({ overallProgress: 55 })} />);
    expect(screen.getByText('55%')).toBeInTheDocument();
  });

  it('should render the hours completed out of total', () => {
    render(
      <ProgressTracker
        summary={buildSummary({ completedHours: 60, totalEstimatedHours: 200 })}
      />
    );
    expect(screen.getByText('60 of 200 estimated hours completed')).toBeInTheDocument();
  });

  it('should not render learning paths when paths array is empty', () => {
    render(<ProgressTracker summary={buildSummary({ paths: [] })} />);
    expect(screen.queryByText('Learning Paths')).not.toBeInTheDocument();
  });

  it('should render individual learning path names', () => {
    const paths = [
      {
        id: 'path-1',
        skillName: 'React',
        skillCategory: 'frontend',
        status: 'in_progress',
        progressPercentage: 60,
        estimatedHours: 30,
      },
      {
        id: 'path-2',
        skillName: 'Python',
        skillCategory: 'programming',
        status: 'completed',
        progressPercentage: 100,
        estimatedHours: 50,
      },
    ];

    render(<ProgressTracker summary={buildSummary({ paths: paths as any })} />);

    expect(screen.getByText('React')).toBeInTheDocument();
    expect(screen.getByText('Python')).toBeInTheDocument();
    expect(screen.getByText('Learning Paths')).toBeInTheDocument();
  });

  it('should show the progress percentage for each path', () => {
    const paths = [
      {
        id: 'path-1',
        skillName: 'Docker',
        skillCategory: 'devops',
        status: 'in_progress',
        progressPercentage: 75,
        estimatedHours: 20,
      },
    ];
    render(<ProgressTracker summary={buildSummary({ paths: paths as any })} />);
    expect(screen.getByText('75%')).toBeInTheDocument();
  });
});
