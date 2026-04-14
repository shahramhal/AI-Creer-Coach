import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { CVHealthScore } from './CVHealthScore';

vi.mock('next/link', () => ({
  default: ({ href, children }: { href: string; children: React.ReactNode }) => (
    <a href={href}>{children}</a>
  ),
}));

vi.mock('@/components/ui/count-up', () => ({
  CountUp: ({ value, suffix = '' }: { value: number; suffix?: string }) => (
    <span>{value}{suffix}</span>
  ),
}));

describe('CVHealthScore', () => {
  it('should render a loading skeleton when isLoading is true', () => {
    const { container } = render(
      <CVHealthScore score={null} issues={0} hasCv={false} hasAnalysis={false} isLoading={true} />
    );
    const pulsing = container.querySelectorAll('.animate-pulse');
    expect(pulsing.length).toBeGreaterThan(0);
  });

  it('should prompt the user to upload a CV when hasCv is false', () => {
    render(
      <CVHealthScore score={null} issues={0} hasCv={false} hasAnalysis={false} isLoading={false} />
    );
    expect(screen.getByText('Upload your CV')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /upload cv/i })).toHaveAttribute('href', '/cvs');
  });

  it('should prompt the user to analyze the CV when hasCv is true but hasAnalysis is false', () => {
    render(
      <CVHealthScore score={null} issues={0} hasCv={true} hasAnalysis={false} isLoading={false} />
    );
    expect(screen.getByText('Analyze your CV to get a score')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /analyze cv/i })).toHaveAttribute('href', '/cvs');
  });

  it('should render the score when hasCv and hasAnalysis are both true', () => {
    render(
      <CVHealthScore score={72} issues={2} hasCv={true} hasAnalysis={true} isLoading={false} />
    );
    expect(screen.getByText('72')).toBeInTheDocument();
    expect(screen.getByText('/100')).toBeInTheDocument();
  });

  it('should show the issues count when there are issues to fix', () => {
    render(
      <CVHealthScore score={55} issues={3} hasCv={true} hasAnalysis={true} isLoading={false} />
    );
    expect(screen.getByText('3')).toBeInTheDocument();
    expect(screen.getByText('issues to fix')).toBeInTheDocument();
  });

  it('should not show issues text when there are zero issues', () => {
    render(
      <CVHealthScore score={90} issues={0} hasCv={true} hasAnalysis={true} isLoading={false} />
    );
    expect(screen.queryByText('issues to fix')).not.toBeInTheDocument();
  });

  it('should show the "Improve Score" link when score is available', () => {
    render(
      <CVHealthScore score={65} issues={0} hasCv={true} hasAnalysis={true} isLoading={false} />
    );
    expect(screen.getByRole('link', { name: /improve score/i })).toHaveAttribute('href', '/cvs');
  });

  it('should render the "CV Health Score" heading', () => {
    render(
      <CVHealthScore score={80} issues={0} hasCv={true} hasAnalysis={true} isLoading={false} />
    );
    expect(screen.getByText('CV Health Score')).toBeInTheDocument();
  });
});
