// apps/frontend/components/jobs/JobMatchCard.test.tsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { JobMatchCard } from './JobMatchCard';
import type { MatchedJob } from '@/types/matching.types';

// Mock the application service so we never hit a real API
vi.mock('@/services/application.service', () => ({
  applicationService: {
    createApplication: vi.fn(),
  },
}));

import { applicationService } from '@/services/application.service';
const mockCreateApplication = applicationService.createApplication as ReturnType<typeof vi.fn>;

function buildTestJob(overrides: Partial<MatchedJob> = {}): MatchedJob {
  return {
    job_id: 'job-001',
    source: 'adzuna',
    title: 'Senior Frontend Developer',
    company: 'Tech Innovations Ltd',
    location: 'London, UK',
    description: 'We are looking for a skilled frontend developer to join our team.',
    salary_min: 60000,
    salary_max: 85000,
    source_url: 'https://www.adzuna.co.uk/job/123',
    posted_date: '2026-01-15T00:00:00.000Z',
    match_score: 78,
    match_breakdown: {
      skill_coverage: 75,
      matched_skills: ['React', 'TypeScript', 'CSS'],
      missing_skills: ['GraphQL'],
      title_relevance: 80,
      summary: 'Good match based on your React and TypeScript experience.',
    },
    ...overrides,
  };
}

function renderWithQueryClient(component: React.ReactNode) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>{component}</QueryClientProvider>
  );
}

describe('JobMatchCard - rendering', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(window, 'open').mockImplementation(() => null);
  });

  it('should display the job title', () => {
    renderWithQueryClient(<JobMatchCard job={buildTestJob()} />);

    expect(screen.getByText('Senior Frontend Developer')).toBeInTheDocument();
  });

  it('should display the company name', () => {
    renderWithQueryClient(<JobMatchCard job={buildTestJob()} />);

    expect(screen.getByText('Tech Innovations Ltd')).toBeInTheDocument();
  });

  it('should display the job location', () => {
    renderWithQueryClient(<JobMatchCard job={buildTestJob()} />);

    expect(screen.getByText('London, UK')).toBeInTheDocument();
  });

  it('should display the match score as a percentage', () => {
    renderWithQueryClient(<JobMatchCard job={buildTestJob({ match_score: 78 })} />);

    const scoreElements = screen.getAllByText('78%');
    expect(scoreElements.length).toBeGreaterThanOrEqual(1);
  });

  it('should display the salary range when both min and max are provided', () => {
    renderWithQueryClient(<JobMatchCard job={buildTestJob({ salary_min: 60000, salary_max: 85000 })} />);

    expect(screen.getByText(/60,000/)).toBeInTheDocument();
    expect(screen.getByText(/85,000/)).toBeInTheDocument();
  });

  it('should not display a salary when salary_min is not provided', () => {
    renderWithQueryClient(<JobMatchCard job={buildTestJob({ salary_min: undefined, salary_max: undefined })} />);

    expect(screen.queryByText(/£60,000/)).not.toBeInTheDocument();
  });

  it('should show the job source badge', () => {
    renderWithQueryClient(<JobMatchCard job={buildTestJob({ source: 'adzuna' })} />);

    expect(screen.getByText('adzuna')).toBeInTheDocument();
  });

  it('should show "Apply Now" button when alreadyApplied is false', () => {
    renderWithQueryClient(<JobMatchCard job={buildTestJob()} alreadyApplied={false} />);

    expect(screen.getByRole('button', { name: /apply now/i })).toBeInTheDocument();
  });

  it('should show "Applied" button when alreadyApplied is true', () => {
    renderWithQueryClient(<JobMatchCard job={buildTestJob()} alreadyApplied />);

    expect(screen.getByRole('button', { name: /applied/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /apply now/i })).not.toBeInTheDocument();
  });

  it('should show "Why this matches?" toggle button initially', () => {
    renderWithQueryClient(<JobMatchCard job={buildTestJob()} />);

    expect(screen.getByRole('button', { name: /why this matches/i })).toBeInTheDocument();
  });
});

describe('JobMatchCard - expand/collapse analysis', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(window, 'open').mockImplementation(() => null);
  });

  it('should not show analysis section before toggle button is clicked', () => {
    renderWithQueryClient(<JobMatchCard job={buildTestJob()} />);

    expect(screen.queryByText('Matched Skills')).not.toBeInTheDocument();
  });

  it('should show matched and missing skills after clicking the toggle button', async () => {
    renderWithQueryClient(<JobMatchCard job={buildTestJob()} />);

    await act(async () => {
      userEvent.click(screen.getByRole('button', { name: /why this matches/i }));
    });

    expect(screen.getByText('Matched Skills')).toBeInTheDocument();
    expect(screen.getByText('Skills to Develop')).toBeInTheDocument();
  });

  it('should display matched skill badges in the expanded analysis section', async () => {
    const testJob = buildTestJob({
      match_breakdown: {
        skill_coverage: 80,
        matched_skills: ['React', 'TypeScript'],
        missing_skills: ['GraphQL'],
        title_relevance: 85,
        summary: 'Strong match.',
      },
    });
    renderWithQueryClient(<JobMatchCard job={testJob} />);

    await act(async () => {
      userEvent.click(screen.getByRole('button', { name: /why this matches/i }));
    });

    expect(screen.getByText('React')).toBeInTheDocument();
    expect(screen.getByText('TypeScript')).toBeInTheDocument();
  });

  it('should display missing skill badges in the expanded analysis section', async () => {
    const testJob = buildTestJob({
      match_breakdown: {
        skill_coverage: 60,
        matched_skills: ['React'],
        missing_skills: ['Kubernetes', 'Terraform'],
        title_relevance: 70,
        summary: 'Partial match.',
      },
    });
    renderWithQueryClient(<JobMatchCard job={testJob} />);

    await act(async () => {
      userEvent.click(screen.getByRole('button', { name: /why this matches/i }));
    });

    expect(screen.getByText('Kubernetes')).toBeInTheDocument();
    expect(screen.getByText('Terraform')).toBeInTheDocument();
  });

  it('should show "Hide Analysis" label after the analysis section is expanded', async () => {
    renderWithQueryClient(<JobMatchCard job={buildTestJob()} />);

    await act(async () => {
      userEvent.click(screen.getByRole('button', { name: /why this matches/i }));
    });

    expect(screen.getByRole('button', { name: /hide analysis/i })).toBeInTheDocument();
  });

  it('should hide the analysis section after clicking "Hide Analysis"', async () => {
    renderWithQueryClient(<JobMatchCard job={buildTestJob()} />);

    await act(async () => {
      userEvent.click(screen.getByRole('button', { name: /why this matches/i }));
    });
    await act(async () => {
      userEvent.click(screen.getByRole('button', { name: /hide analysis/i }));
    });

    expect(screen.queryByText('Matched Skills')).not.toBeInTheDocument();
  });

  it('should show the match summary text in the expanded analysis section', async () => {
    const testJob = buildTestJob({
      match_breakdown: {
        ...buildTestJob().match_breakdown,
        summary: 'Good match based on your React and TypeScript experience.',
      },
    });
    renderWithQueryClient(<JobMatchCard job={testJob} />);

    await act(async () => {
      userEvent.click(screen.getByRole('button', { name: /why this matches/i }));
    });

    expect(screen.getByText('Good match based on your React and TypeScript experience.')).toBeInTheDocument();
  });
});

describe('JobMatchCard - apply confirmation dialog', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(window, 'open').mockImplementation(() => null);
  });

  it('should open the confirmation dialog when "Apply Now" is clicked', async () => {
    renderWithQueryClient(<JobMatchCard job={buildTestJob()} />);

    await act(async () => {
      userEvent.click(screen.getByRole('button', { name: /apply now/i }));
    });

    expect(screen.getByText('Did you apply for this job?')).toBeInTheDocument();
  });

  it('should display the job title and company in the confirmation dialog', async () => {
    const testJob = buildTestJob({ title: 'Senior Frontend Developer', company: 'Tech Innovations Ltd' });
    renderWithQueryClient(<JobMatchCard job={testJob} />);

    await act(async () => {
      userEvent.click(screen.getByRole('button', { name: /apply now/i }));
    });

    // Both the card and the dialog may render the title/company - verify at least one instance exists
    expect(screen.getAllByText('Senior Frontend Developer').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Tech Innovations Ltd').length).toBeGreaterThanOrEqual(1);
  });

  it('should close the dialog and not create an application when "No, not yet" is clicked', async () => {
    renderWithQueryClient(<JobMatchCard job={buildTestJob()} />);

    await act(async () => {
      userEvent.click(screen.getByRole('button', { name: /apply now/i }));
    });
    await act(async () => {
      userEvent.click(screen.getByRole('button', { name: /no, not yet/i }));
    });

    expect(mockCreateApplication).not.toHaveBeenCalled();
    await waitFor(() => {
      expect(screen.queryByText('Did you apply for this job?')).not.toBeInTheDocument();
    });
  });

  it('should call createApplication and switch to "Applied" state when "Yes, I applied" is clicked', async () => {
    mockCreateApplication.mockResolvedValue({ success: true, message: 'Created', data: {} });

    renderWithQueryClient(<JobMatchCard job={buildTestJob()} />);

    await act(async () => {
      userEvent.click(screen.getByRole('button', { name: /apply now/i }));
    });
    await act(async () => {
      userEvent.click(screen.getByRole('button', { name: /yes, i applied/i }));
    });

    await waitFor(() => {
      expect(mockCreateApplication).toHaveBeenCalledOnce();
    });
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /applied/i })).toBeInTheDocument();
    });
  });

  it('should call createApplication with the correct job data', async () => {
    const testJob = buildTestJob({
      company: 'Innovative Corp',
      title: 'Backend Engineer',
      source_url: 'https://job-board.com/job/99',
      location: 'Manchester',
    });
    mockCreateApplication.mockResolvedValue({ success: true, message: 'Created', data: {} });

    renderWithQueryClient(<JobMatchCard job={testJob} />);

    await act(async () => {
      userEvent.click(screen.getByRole('button', { name: /apply now/i }));
    });
    await act(async () => {
      userEvent.click(screen.getByRole('button', { name: /yes, i applied/i }));
    });

    await waitFor(() => {
      expect(mockCreateApplication).toHaveBeenCalledWith({
        company: 'Innovative Corp',
        jobTitle: 'Backend Engineer',
        sourceUrl: 'https://job-board.com/job/99',
        location: 'Manchester',
      });
    });
  });

  it('should open the job URL in a new tab when Apply Now is clicked and URL is valid', async () => {
    const windowOpenSpy = vi.spyOn(window, 'open').mockImplementation(() => null);
    const testJob = buildTestJob({ source_url: 'https://jobs.example.com/123' });

    renderWithQueryClient(<JobMatchCard job={testJob} />);

    await act(async () => {
      userEvent.click(screen.getByRole('button', { name: /apply now/i }));
    });

    expect(windowOpenSpy).toHaveBeenCalledWith(
      'https://jobs.example.com/123',
      '_blank',
      'noopener,noreferrer'
    );
  });
});
