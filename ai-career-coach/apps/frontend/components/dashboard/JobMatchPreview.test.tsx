import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { JobMatchPreview } from './JobMatchPreview';
import type { MatchedJob } from '@/types/matching.types';

vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
      <div {...props}>{children}</div>
    ),
  },
}));

vi.mock('next/link', () => ({
  default: ({ href, children }: { href: string; children: React.ReactNode }) => (
    <a href={href}>{children}</a>
  ),
}));

vi.mock('@/components/ui/count-up', () => ({
  CountUp: ({ value, suffix }: { value: number; suffix?: string }) => (
    <span>{value}{suffix}</span>
  ),
}));

function buildMatchedJob(overrides: Partial<MatchedJob> = {}): MatchedJob {
  return {
    job_id: 'job-001',
    source: 'adzuna',
    title: 'Frontend Engineer',
    company: 'TechCo',
    location: 'London, UK',
    description: 'Build great UIs.',
    salary_min: 60000,
    salary_max: 80000,
    source_url: 'https://example.com/job-001',
    posted_date: '2026-04-01T00:00:00.000Z',
    match_score: 85.4,
    match_label: 'Strong Match',
    match_breakdown: {
      skill_coverage: 90,
      matched_skills: ['React', 'TypeScript'],
      missing_skills: ['GraphQL'],
      title_relevance: 80,
      summary: 'Good match',
    },
    remote_type: 'remote',
    ...overrides,
  };
}

describe('JobMatchPreview - card header', () => {
  it('should render the "Top Job Matches" title', () => {
    render(<JobMatchPreview isLoading={false} />);
    expect(screen.getByText('Top Job Matches')).toBeInTheDocument();
  });

  it('should render a "View All Jobs" link', () => {
    render(<JobMatchPreview isLoading={false} />);
    expect(screen.getByRole('link', { name: /view all jobs/i })).toBeInTheDocument();
  });
});

describe('JobMatchPreview - loading state', () => {
  it('should render skeleton placeholders while loading', () => {
    const { container } = render(<JobMatchPreview isLoading={true} />);
    const skeletons = container.querySelectorAll('.animate-pulse');
    expect(skeletons.length).toBeGreaterThan(0);
  });
});

describe('JobMatchPreview - error state', () => {
  it('should show an error message when isError is true', () => {
    render(<JobMatchPreview isLoading={false} isError={true} />);
    expect(screen.getByText(/job matching data unavailable/i)).toBeInTheDocument();
  });
});

describe('JobMatchPreview - empty state', () => {
  it('should show the "No job matches yet" message when jobs is undefined', () => {
    render(<JobMatchPreview isLoading={false} />);
    expect(screen.getByText('No job matches yet')).toBeInTheDocument();
  });

  it('should show the "No job matches yet" message when jobs array is empty', () => {
    render(<JobMatchPreview isLoading={false} jobs={[]} />);
    expect(screen.getByText('No job matches yet')).toBeInTheDocument();
  });

  it('should show a "Find Jobs" link in the empty state', () => {
    render(<JobMatchPreview isLoading={false} jobs={[]} />);
    expect(screen.getByRole('link', { name: /find jobs/i })).toBeInTheDocument();
  });
});

describe('JobMatchPreview - populated state', () => {
  const sampleJobs = [buildMatchedJob(), buildMatchedJob({ job_id: 'job-002', title: 'React Developer', match_score: 70 })];

  it('should render all job titles', () => {
    render(<JobMatchPreview isLoading={false} jobs={sampleJobs} />);
    expect(screen.getByText('Frontend Engineer')).toBeInTheDocument();
    expect(screen.getByText('React Developer')).toBeInTheDocument();
  });

  it('should display the company name', () => {
    render(<JobMatchPreview isLoading={false} jobs={[buildMatchedJob()]} />);
    expect(screen.getByText('TechCo')).toBeInTheDocument();
  });

  it('should display a "Remote" badge when remote_type is remote', () => {
    render(<JobMatchPreview isLoading={false} jobs={[buildMatchedJob({ remote_type: 'remote' })]} />);
    expect(screen.getByText('Remote')).toBeInTheDocument();
  });

  it('should not show a "Remote" badge when remote_type is not remote', () => {
    render(<JobMatchPreview isLoading={false} jobs={[buildMatchedJob({ remote_type: 'on-site' })]} />);
    expect(screen.queryByText('Remote')).not.toBeInTheDocument();
  });

  it('should display the match score as a percentage', () => {
    render(<JobMatchPreview isLoading={false} jobs={[buildMatchedJob({ match_score: 85 })]} />);
    expect(screen.getByText('85%')).toBeInTheDocument();
  });

  it('should display the match label', () => {
    render(<JobMatchPreview isLoading={false} jobs={[buildMatchedJob()]} />);
    expect(screen.getByText('Strong Match')).toBeInTheDocument();
  });

  it('should display matched skills as badges', () => {
    render(<JobMatchPreview isLoading={false} jobs={[buildMatchedJob()]} />);
    expect(screen.getByText('React')).toBeInTheDocument();
    expect(screen.getByText('TypeScript')).toBeInTheDocument();
  });

  it('should display missing skills as badges', () => {
    render(<JobMatchPreview isLoading={false} jobs={[buildMatchedJob()]} />);
    expect(screen.getByText('GraphQL')).toBeInTheDocument();
  });

  it('should display a formatted salary range', () => {
    render(<JobMatchPreview isLoading={false} jobs={[buildMatchedJob({ salary_min: 60000, salary_max: 80000 })]} />);
    expect(screen.getByText('$60k - $80k')).toBeInTheDocument();
  });

  it('should display "Salary not listed" when no salary is provided', () => {
    render(<JobMatchPreview isLoading={false} jobs={[buildMatchedJob({ salary_min: undefined, salary_max: undefined })]} />);
    expect(screen.getByText('Salary not listed')).toBeInTheDocument();
  });
});

describe('JobMatchPreview - refresh button', () => {
  it('should render the refresh button when onRefresh is provided', () => {
    render(<JobMatchPreview isLoading={false} onRefresh={vi.fn()} />);
    expect(screen.getByTitle('Refresh matches')).toBeInTheDocument();
  });

  it('should call onRefresh when the refresh button is clicked', async () => {
    const onRefresh = vi.fn();
    render(<JobMatchPreview isLoading={false} onRefresh={onRefresh} />);
    await userEvent.click(screen.getByTitle('Refresh matches'));
    expect(onRefresh).toHaveBeenCalledOnce();
  });

  it('should disable the refresh button while loading', () => {
    render(<JobMatchPreview isLoading={true} onRefresh={vi.fn()} />);
    expect(screen.getByTitle('Refresh matches')).toBeDisabled();
  });
});
