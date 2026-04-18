import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { IntegrationsTab } from './IntegrationsTab';

vi.mock('@/hooks/useToast', () => ({
  useToast: vi.fn().mockReturnValue({
    showSuccessToast: vi.fn(),
  }),
}));

import { useToast } from '@/hooks/useToast';

describe('IntegrationsTab - rendering', () => {
  it('should render the "Connected Accounts" card title', () => {
    render(<IntegrationsTab />);
    expect(screen.getByText('Connected Accounts')).toBeInTheDocument();
  });

  it('should render three integration items', () => {
    render(<IntegrationsTab />);
    expect(screen.getByText('LinkedIn')).toBeInTheDocument();
    expect(screen.getByText('Google Calendar')).toBeInTheDocument();
    expect(screen.getByText('Gmail')).toBeInTheDocument();
  });

  it('should show a "Disconnect" button for the already-connected LinkedIn integration', () => {
    render(<IntegrationsTab />);
    const linkedinRow = screen.getByText('LinkedIn').closest('[class*="rounded-lg"]')!;
    expect(linkedinRow.querySelector('button')?.textContent).toBe('Disconnect');
  });

  it('should show a "Connect" button for the not-connected Google Calendar integration', () => {
    render(<IntegrationsTab />);
    const calendarRow = screen.getByText('Google Calendar').closest('[class*="rounded-lg"]')!;
    expect(calendarRow.querySelector('button')?.textContent).toBe('Connect');
  });
});

describe('IntegrationsTab - toggle connection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should change "Disconnect" to "Connect" when disconnecting LinkedIn', async () => {
    render(<IntegrationsTab />);
    const linkedinRow = screen.getByText('LinkedIn').closest('[class*="rounded-lg"]')!;
    const button = linkedinRow.querySelector('button')!;

    expect(button.textContent).toBe('Disconnect');
    await userEvent.click(button);

    expect(button.textContent).toBe('Connect');
  });

  it('should update the description to "Not connected" after disconnecting', async () => {
    render(<IntegrationsTab />);
    const linkedinRow = screen.getByText('LinkedIn').closest('[class*="rounded-lg"]')!;
    const button = linkedinRow.querySelector('button')!;
    await userEvent.click(button);

    expect(linkedinRow.textContent).toContain('Not connected');
  });

  it('should change "Connect" to "Disconnect" when connecting Gmail', async () => {
    render(<IntegrationsTab />);
    const gmailRow = screen.getByText('Gmail').closest('[class*="rounded-lg"]')!;
    const button = gmailRow.querySelector('button')!;

    expect(button.textContent).toBe('Connect');
    await userEvent.click(button);

    expect(button.textContent).toBe('Disconnect');
  });

  it('should show a success toast after toggling a connection', async () => {
    const { showSuccessToast } = vi.mocked(useToast)();
    render(<IntegrationsTab />);

    await userEvent.click(screen.getAllByRole('button')[0]);

    await waitFor(() => {
      expect(showSuccessToast).toHaveBeenCalledWith(expect.stringContaining('LinkedIn'));
    });
  });
});
