import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { AdminOverviewStats } from './AdminOverviewStats';
import type { AdminDashboardStats } from '@/types/admin.types';

const baseStats: AdminDashboardStats = {
  totalUsers: 1234,
  totalCVs: 567,
  totalJobs: 89,
  totalApplications: 342,
  adminCount: 5,
  disabledUsers: 12,
  serviceHealth: {
    postgres: true,
    mongodb: true,
    redis: true,
    mlService: true,
    jobApiService: true,
  },
};

describe('AdminOverviewStats', () => {
  it('should render all six stat card labels', () => {
    render(<AdminOverviewStats stats={baseStats} />);

    expect(screen.getByText('Total Users')).toBeInTheDocument();
    expect(screen.getByText('Total CVs')).toBeInTheDocument();
    expect(screen.getByText('Total Jobs')).toBeInTheDocument();
    expect(screen.getByText('Applications')).toBeInTheDocument();
    expect(screen.getByText('Admins')).toBeInTheDocument();
    expect(screen.getByText('Disabled Users')).toBeInTheDocument();
  });

  it('should display the numeric value for total users', () => {
    render(<AdminOverviewStats stats={baseStats} />);
    expect(screen.getByText('1,234')).toBeInTheDocument();
  });

  it('should display the numeric value for total CVs', () => {
    render(<AdminOverviewStats stats={baseStats} />);
    expect(screen.getByText('567')).toBeInTheDocument();
  });

  it('should display the admin count', () => {
    render(<AdminOverviewStats stats={baseStats} />);
    expect(screen.getByText('5')).toBeInTheDocument();
  });

  it('should display the disabled users count', () => {
    render(<AdminOverviewStats stats={baseStats} />);
    expect(screen.getByText('12')).toBeInTheDocument();
  });

  it('should render six individual cards', () => {
    const { container } = render(<AdminOverviewStats stats={baseStats} />);
    const cards = container.querySelectorAll('.p-4');
    expect(cards.length).toBe(6);
  });
});
