// apps/frontend/components/dashboard/QuickStats.test.tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QuickStats } from './QuickStats';

vi.mock('@/components/ui/count-up', () => ({
  CountUp: ({ value, suffix = '' }: { value: number; suffix?: string }) => (
    <span>{value}{suffix}</span>
  ),
}));

describe('QuickStats', () => {
  it('should render all four stat card titles', () => {
    render(<QuickStats isLoading={false} />);

    expect(screen.getByText('Job Matches')).toBeInTheDocument();
    expect(screen.getByText('Skills to Learn')).toBeInTheDocument();
    expect(screen.getByText('Active Applications')).toBeInTheDocument();
    expect(screen.getByText('Response Rate')).toBeInTheDocument();
  });

  it('should show loading skeletons for all cards when isLoading is true', () => {
    const { container } = render(<QuickStats isLoading />);

    const skeletons = container.querySelectorAll('.animate-pulse');
    expect(skeletons.length).toBe(4);
  });

  it('should display "--" placeholder values when no data props are provided', () => {
    render(<QuickStats isLoading={false} />);

    const dashPlaceholders = screen.getAllByText('--');
    expect(dashPlaceholders.length).toBe(4);
  });

  it('should display the provided matchCount value', () => {
    render(<QuickStats isLoading={false} matchCount={42} />);

    expect(screen.getByText('42')).toBeInTheDocument();
  });

  it('should display the provided activeApplications count', () => {
    render(<QuickStats isLoading={false} activeApplications={7} />);

    expect(screen.getByText('7')).toBeInTheDocument();
  });

  it('should display the response rate with a percent sign', () => {
    render(<QuickStats isLoading={false} responseRate={25} />);

    expect(screen.getByText('25%')).toBeInTheDocument();
  });

  it('should display the "Excludes rejected" change label when activeApplications is provided', () => {
    render(<QuickStats isLoading={false} activeApplications={3} />);

    expect(screen.getByText('Excludes rejected')).toBeInTheDocument();
  });

  it('should display the "Interview or offer" change label when responseRate is provided', () => {
    render(<QuickStats isLoading={false} responseRate={15} />);

    expect(screen.getByText('Interview or offer')).toBeInTheDocument();
  });

  it('should not show change labels when isLoading is true', () => {
    render(<QuickStats isLoading activeApplications={5} responseRate={20} />);

    expect(screen.queryByText('Excludes rejected')).not.toBeInTheDocument();
    expect(screen.queryByText('Interview or offer')).not.toBeInTheDocument();
  });

  it('should display skillsToLearn value when provided', () => {
    render(<QuickStats isLoading={false} skillsToLearn={10} inProgressSkills={3} />);

    expect(screen.getByText('10')).toBeInTheDocument();
    expect(screen.getByText('3 in progress')).toBeInTheDocument();
  });

  it('should show "Above 55% match" label when matchCount is provided', () => {
    render(<QuickStats isLoading={false} matchCount={5} />);

    expect(screen.getByText('Above 55% match')).toBeInTheDocument();
  });
});
