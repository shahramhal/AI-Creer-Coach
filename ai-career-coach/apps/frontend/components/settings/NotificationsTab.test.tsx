import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { NotificationsTab } from './NotificationsTab';

vi.mock('@/hooks/useToast', () => ({
  useToast: vi.fn().mockReturnValue({
    showSuccessToast: vi.fn(),
  }),
}));

import { useToast } from '@/hooks/useToast';

describe('NotificationsTab - rendering', () => {
  it('should render the "Email Notifications" card title', () => {
    render(<NotificationsTab />);
    expect(screen.getByText('Email Notifications')).toBeInTheDocument();
  });

  it('should render all six notification setting items', () => {
    render(<NotificationsTab />);
    expect(screen.getByText('New Job Matches')).toBeInTheDocument();
    expect(screen.getByText('Application Updates')).toBeInTheDocument();
    expect(screen.getByText('Interview Reminders')).toBeInTheDocument();
    expect(screen.getByText('Salary Insights')).toBeInTheDocument();
    expect(screen.getByText('Learning Reminders')).toBeInTheDocument();
    expect(screen.getByText('Weekly Digest')).toBeInTheDocument();
  });

  it('should render six toggle switches', () => {
    render(<NotificationsTab />);
    const switches = screen.getAllByRole('switch');
    expect(switches).toHaveLength(6);
  });

  it('should show initially enabled notifications as checked', () => {
    render(<NotificationsTab />);
    // "New Job Matches" is enabled by default
    const jobMatchesSwitch = screen.getAllByRole('switch')[0];
    expect(jobMatchesSwitch).toHaveAttribute('aria-checked', 'true');
  });

  it('should show initially disabled notifications as unchecked', () => {
    render(<NotificationsTab />);
    // "Salary Insights" (index 3) is disabled by default
    const salarySwitch = screen.getAllByRole('switch')[3];
    expect(salarySwitch).toHaveAttribute('aria-checked', 'false');
  });
});

describe('NotificationsTab - toggle interaction', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should toggle a notification switch when clicked', async () => {
    render(<NotificationsTab />);
    const firstSwitch = screen.getAllByRole('switch')[0];
    const initialState = firstSwitch.getAttribute('aria-checked');

    await userEvent.click(firstSwitch);

    const newState = firstSwitch.getAttribute('aria-checked') === 'true' ? 'true' : 'false';
    expect(newState).not.toBe(initialState);
  });

  it('should show a success toast after toggling a notification', async () => {
    const { showSuccessToast } = vi.mocked(useToast)();
    render(<NotificationsTab />);

    await userEvent.click(screen.getAllByRole('switch')[0]);

    await waitFor(() => {
      expect(showSuccessToast).toHaveBeenCalledWith(
        expect.stringContaining('notification preferences')
      );
    });
  });

  it('should toggle a disabled notification to enabled', async () => {
    render(<NotificationsTab />);
    const salarySwitch = screen.getAllByRole('switch')[3];

    expect(salarySwitch).toHaveAttribute('aria-checked', 'false');
    await userEvent.click(salarySwitch);

    expect(salarySwitch).toHaveAttribute('aria-checked', 'true');
  });

  it('should toggle an enabled notification back to disabled', async () => {
    render(<NotificationsTab />);
    const jobMatchesSwitch = screen.getAllByRole('switch')[0];

    expect(jobMatchesSwitch).toHaveAttribute('aria-checked', 'true');
    await userEvent.click(jobMatchesSwitch);

    expect(jobMatchesSwitch).toHaveAttribute('aria-checked', 'false');
  });
});
