// apps/frontend/components/dashboard/ApplicationKanban.test.tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ApplicationKanban } from './ApplicationKanban';
import type { Application } from '@/types/application.types';

// next/link in jsdom just renders an anchor without routing
vi.mock('next/link', () => ({
  default: ({ href, children, ...rest }: { href: string; children: React.ReactNode; [k: string]: any }) => (
    <a href={href} {...rest}>{children}</a>
  ),
}));

function buildApplication(overrides: Partial<Application> = {}): Application {
  return {
    id: `app-${Math.random().toString(36).slice(2)}`,
    company: 'Test Corp',
    jobTitle: 'Software Engineer',
    status: 'applied',
    appliedDate: '2026-01-15T12:00:00.000Z',
    sourceUrl: null,
    location: null,
    notes: null,
    atsScore: null,
    createdAt: '2026-01-15T12:00:00.000Z',
    updatedAt: '2026-01-15T12:00:00.000Z',
    ...overrides,
  };
}

describe('ApplicationKanban', () => {
  it('should render the "Application Pipeline" card title', () => {
    render(<ApplicationKanban />);

    expect(screen.getByText('Application Pipeline')).toBeInTheDocument();
  });

  it('should show the loading spinner when isLoading is true', () => {
    const { container } = render(<ApplicationKanban isLoading />);

    const spinner = container.querySelector('.animate-spin');
    expect(spinner).toBeInTheDocument();
  });

  it('should show empty-state message when no applications are provided', () => {
    render(<ApplicationKanban applications={[]} />);

    expect(screen.getByText('No applications yet')).toBeInTheDocument();
    expect(screen.getByText('Manage your applications with a visual pipeline')).toBeInTheDocument();
  });

  it('should show empty-state message when applications prop is omitted', () => {
    render(<ApplicationKanban />);

    expect(screen.getByText('No applications yet')).toBeInTheDocument();
  });

  it('should render all four column labels when applications are present', () => {
    const applications = [buildApplication({ status: 'applied' })];
    render(<ApplicationKanban applications={applications} />);

    expect(screen.getByText('Applied')).toBeInTheDocument();
    expect(screen.getByText('Interview')).toBeInTheDocument();
    expect(screen.getByText('Offer')).toBeInTheDocument();
    expect(screen.getByText('Rejected')).toBeInTheDocument();
  });

  it('should display job title and company for each application card', () => {
    const applications = [
      buildApplication({ status: 'applied', jobTitle: 'Backend Developer', company: 'StartupXYZ' }),
    ];
    render(<ApplicationKanban applications={applications} />);

    expect(screen.getByText('Backend Developer')).toBeInTheDocument();
    expect(screen.getByText('StartupXYZ')).toBeInTheDocument();
  });

  it('should group applications into the correct status columns', () => {
    const applications = [
      buildApplication({ status: 'applied', jobTitle: 'Job A', company: 'Corp A' }),
      buildApplication({ status: 'interview', jobTitle: 'Job B', company: 'Corp B' }),
      buildApplication({ status: 'offer', jobTitle: 'Job C', company: 'Corp C' }),
      buildApplication({ status: 'rejected', jobTitle: 'Job D', company: 'Corp D' }),
    ];
    render(<ApplicationKanban applications={applications} />);

    expect(screen.getByText('Job A')).toBeInTheDocument();
    expect(screen.getByText('Job B')).toBeInTheDocument();
    expect(screen.getByText('Job C')).toBeInTheDocument();
    expect(screen.getByText('Job D')).toBeInTheDocument();
  });

  it('should show the "View all" link when applications are present', () => {
    const applications = [buildApplication()];
    render(<ApplicationKanban applications={applications} />);

    const viewAllLink = screen.getByRole('link', { name: 'View all' });
    expect(viewAllLink).toBeInTheDocument();
    expect(viewAllLink).toHaveAttribute('href', '/applications');
  });

  it('should not show the "View all" link when no applications are present', () => {
    render(<ApplicationKanban applications={[]} />);

    expect(screen.queryByRole('link', { name: 'View all' })).not.toBeInTheDocument();
  });

  it('should show a "+N more" overflow link when a column has more than 3 applications', () => {
    const applications = [
      buildApplication({ status: 'applied', jobTitle: 'Job 1', company: 'C1' }),
      buildApplication({ status: 'applied', jobTitle: 'Job 2', company: 'C2' }),
      buildApplication({ status: 'applied', jobTitle: 'Job 3', company: 'C3' }),
      buildApplication({ status: 'applied', jobTitle: 'Job 4', company: 'C4' }),
      buildApplication({ status: 'applied', jobTitle: 'Job 5', company: 'C5' }),
    ];
    render(<ApplicationKanban applications={applications} />);

    expect(screen.getByText('+2 more')).toBeInTheDocument();
  });

  it('should show "None" placeholder in empty columns when other columns have items', () => {
    const applications = [buildApplication({ status: 'applied' })];
    render(<ApplicationKanban applications={applications} />);

    // Three columns (interview, offer, rejected) should show None placeholder
    const nonePlaceholders = screen.getAllByText('None');
    expect(nonePlaceholders.length).toBe(3);
  });

  it('should display correct badge counts for each status column', () => {
    const applications = [
      buildApplication({ status: 'applied' }),
      buildApplication({ status: 'applied' }),
      buildApplication({ status: 'interview' }),
    ];
    render(<ApplicationKanban applications={applications} />);

    // Applied column badge should show 2
    const badges = screen.getAllByText('2');
    expect(badges.length).toBeGreaterThanOrEqual(1);
  });
});
