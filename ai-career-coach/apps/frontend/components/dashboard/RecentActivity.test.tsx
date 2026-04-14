import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { RecentActivity } from './RecentActivity';
import type { DashboardActivity } from '@/types/dashboard.types';

const buildActivity = (overrides: Partial<DashboardActivity> = {}): DashboardActivity => ({
  id: 'act-1',
  type: 'cv_upload',
  title: 'CV Uploaded',
  description: 'You uploaded resume.pdf',
  timestamp: new Date(Date.now() - 60 * 1000).toISOString(),
  ...overrides,
});

describe('RecentActivity', () => {
  it('should render loading skeletons when isLoading is true', () => {
    const { container } = render(<RecentActivity isLoading={true} />);
    const pulsing = container.querySelectorAll('.animate-pulse');
    expect(pulsing.length).toBeGreaterThan(0);
  });

  it('should show an empty state message when there are no activities', () => {
    render(<RecentActivity activities={[]} isLoading={false} />);
    expect(screen.getByText('No recent activity yet')).toBeInTheDocument();
  });

  it('should show empty state when activities is undefined', () => {
    render(<RecentActivity activities={undefined} isLoading={false} />);
    expect(screen.getByText('No recent activity yet')).toBeInTheDocument();
  });

  it('should render the title and description of each activity', () => {
    const activities = [
      buildActivity({ title: 'CV Uploaded', description: 'You uploaded resume.pdf' }),
      buildActivity({
        id: 'act-2',
        type: 'application',
        title: 'Applied to Google',
        description: 'Senior Engineer role',
      }),
    ];
    render(<RecentActivity activities={activities} isLoading={false} />);

    expect(screen.getByText('CV Uploaded')).toBeInTheDocument();
    expect(screen.getByText('You uploaded resume.pdf')).toBeInTheDocument();
    expect(screen.getByText('Applied to Google')).toBeInTheDocument();
    expect(screen.getByText('Senior Engineer role')).toBeInTheDocument();
  });

  it('should display a relative timestamp for each activity', () => {
    const recentTimestamp = new Date(Date.now() - 2 * 60 * 1000).toISOString();
    render(
      <RecentActivity
        activities={[buildActivity({ timestamp: recentTimestamp })]}
        isLoading={false}
      />
    );
    expect(screen.getByText(/ago/i)).toBeInTheDocument();
  });

  it('should show the "Recent Activity" card heading', () => {
    render(<RecentActivity activities={[]} isLoading={false} />);
    expect(screen.getByText('Recent Activity')).toBeInTheDocument();
  });

  it('should render all activities when multiple are provided', () => {
    const activities = Array.from({ length: 5 }, (_, i) =>
      buildActivity({ id: `act-${i}`, title: `Activity ${i}` })
    );
    render(<RecentActivity activities={activities} isLoading={false} />);
    for (let i = 0; i < 5; i++) {
      expect(screen.getByText(`Activity ${i}`)).toBeInTheDocument();
    }
  });
});
