import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import SkillCoverageChart from './SkillCoverageChart';
import type { CategoryBreakdown } from '../../types/skillGap.types';

vi.mock('recharts', async () => {
  const actual = await vi.importActual<typeof import('recharts')>('recharts');
  return {
    ...actual,
    ResponsiveContainer: ({ children }: { children: React.ReactNode }) => (
      <div data-testid="responsive-container">{children}</div>
    ),
  };
});

function buildCategoryBreakdown(category: string, current: number, target: number): CategoryBreakdown {
  return { category, current, target, matched: Math.min(current, target) };
}

const sampleBreakdown: CategoryBreakdown[] = [
  buildCategoryBreakdown('Frontend', 4, 6),
  buildCategoryBreakdown('Backend', 3, 5),
  buildCategoryBreakdown('DevOps', 1, 4),
];

describe('SkillCoverageChart - hero stat display', () => {
  it('should display the overall skill coverage percentage', () => {
    render(
      <SkillCoverageChart
        categoryBreakdown={sampleBreakdown}
        skillCoverage={75}
        matchedCount={6}
        totalTargetSkills={8}
      />
    );
    expect(screen.getByText('75%')).toBeInTheDocument();
  });

  it('should display the matched count and total target skills', () => {
    render(
      <SkillCoverageChart
        categoryBreakdown={sampleBreakdown}
        skillCoverage={75}
        matchedCount={6}
        totalTargetSkills={8}
      />
    );
    expect(screen.getByText('6 of 8 target skills matched')).toBeInTheDocument();
  });

  it('should render the "Overall Skill Coverage" label', () => {
    render(
      <SkillCoverageChart
        categoryBreakdown={sampleBreakdown}
        skillCoverage={50}
        matchedCount={4}
        totalTargetSkills={8}
      />
    );
    expect(screen.getByText('Overall Skill Coverage')).toBeInTheDocument();
  });
});

describe('SkillCoverageChart - coverage color thresholds', () => {
  it('should apply green color class when coverage is 70 or above', () => {
    const { container } = render(
      <SkillCoverageChart
        categoryBreakdown={[]}
        skillCoverage={70}
        matchedCount={7}
        totalTargetSkills={10}
      />
    );
    expect(container.querySelector('.text-green-600')).toBeInTheDocument();
  });

  it('should apply yellow color class when coverage is between 40 and 69', () => {
    const { container } = render(
      <SkillCoverageChart
        categoryBreakdown={[]}
        skillCoverage={55}
        matchedCount={5}
        totalTargetSkills={10}
      />
    );
    expect(container.querySelector('.text-yellow-600')).toBeInTheDocument();
  });

  it('should apply red color class when coverage is below 40', () => {
    const { container } = render(
      <SkillCoverageChart
        categoryBreakdown={[]}
        skillCoverage={30}
        matchedCount={3}
        totalTargetSkills={10}
      />
    );
    expect(container.querySelector('.text-red-600')).toBeInTheDocument();
  });
});

describe('SkillCoverageChart - bar chart', () => {
  it('should render the chart when categoryBreakdown has entries', () => {
    render(
      <SkillCoverageChart
        categoryBreakdown={sampleBreakdown}
        skillCoverage={60}
        matchedCount={5}
        totalTargetSkills={8}
      />
    );
    expect(screen.getByTestId('responsive-container')).toBeInTheDocument();
  });

  it('should not render a chart when categoryBreakdown is empty', () => {
    render(
      <SkillCoverageChart
        categoryBreakdown={[]}
        skillCoverage={0}
        matchedCount={0}
        totalTargetSkills={10}
      />
    );
    expect(screen.queryByTestId('responsive-container')).not.toBeInTheDocument();
  });

  it('should render the "Skills by Category" heading when breakdown has entries', () => {
    render(
      <SkillCoverageChart
        categoryBreakdown={sampleBreakdown}
        skillCoverage={60}
        matchedCount={5}
        totalTargetSkills={8}
      />
    );
    expect(screen.getByText('Skills by Category')).toBeInTheDocument();
  });

  it('should not render the "Skills by Category" heading when breakdown is empty', () => {
    render(
      <SkillCoverageChart
        categoryBreakdown={[]}
        skillCoverage={0}
        matchedCount={0}
        totalTargetSkills={0}
      />
    );
    expect(screen.queryByText('Skills by Category')).not.toBeInTheDocument();
  });
});
