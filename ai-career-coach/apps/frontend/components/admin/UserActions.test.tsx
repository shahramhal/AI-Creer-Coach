import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { UserActions } from './UserActions';
import type { AdminUser } from '@/types/admin.types';

vi.mock('@/services/admin.service', () => ({
  adminService: {
    toggleUserStatus: vi.fn(),
    promoteUser: vi.fn(),
    demoteUser: vi.fn(),
    forceResetPassword: vi.fn(),
    deleteUser: vi.fn(),
  },
}));

import { adminService } from '@/services/admin.service';

const mockToggle = adminService.toggleUserStatus as ReturnType<typeof vi.fn>;
const mockPromote = adminService.promoteUser as ReturnType<typeof vi.fn>;
const mockDemote = adminService.demoteUser as ReturnType<typeof vi.fn>;
const mockReset = adminService.forceResetPassword as ReturnType<typeof vi.fn>;
const mockDelete = adminService.deleteUser as ReturnType<typeof vi.fn>;

const buildUser = (overrides: Partial<AdminUser> = {}): AdminUser => ({
  id: 'user-abc',
  email: 'test@example.com',
  firstName: 'Test',
  lastName: 'User',
  role: 'USER',
  isDisabled: false,
  isEmailVerified: true,
  lastLoginAt: null,
  createdAt: '2024-01-01T00:00:00Z',
  _count: { cvs: 1, applications: 2 },
  ...overrides,
});

const noop = vi.fn();

describe('UserActions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render the trigger button', () => {
    render(<UserActions user={buildUser()} onActionComplete={noop} />);
    expect(screen.getByRole('button')).toBeInTheDocument();
  });

  it('should show Disable option for an active user', async () => {
    render(<UserActions user={buildUser({ isDisabled: false })} onActionComplete={noop} />);
    await userEvent.click(screen.getByRole('button'));
    expect(await screen.findByText('Disable')).toBeInTheDocument();
  });

  it('should show Enable option for a disabled user', async () => {
    render(<UserActions user={buildUser({ isDisabled: true })} onActionComplete={noop} />);
    await userEvent.click(screen.getByRole('button'));
    expect(await screen.findByText('Enable')).toBeInTheDocument();
  });

  it('should show Promote to Admin for a USER-role user', async () => {
    render(<UserActions user={buildUser({ role: 'USER' })} onActionComplete={noop} />);
    await userEvent.click(screen.getByRole('button'));
    expect(await screen.findByText('Promote to Admin')).toBeInTheDocument();
  });

  it('should show Demote to User for an ADMIN-role user', async () => {
    render(<UserActions user={buildUser({ role: 'ADMIN' })} onActionComplete={noop} />);
    await userEvent.click(screen.getByRole('button'));
    expect(await screen.findByText('Demote to User')).toBeInTheDocument();
  });

  it('should always show Reset Password and Delete User options', async () => {
    render(<UserActions user={buildUser()} onActionComplete={noop} />);
    await userEvent.click(screen.getByRole('button'));
    expect(await screen.findByText('Reset Password')).toBeInTheDocument();
    expect(await screen.findByText('Delete User')).toBeInTheDocument();
  });

  it('should open confirmation dialog with Disable title when Disable is clicked', async () => {
    render(<UserActions user={buildUser({ isDisabled: false })} onActionComplete={noop} />);
    await userEvent.click(screen.getByRole('button'));
    await userEvent.click(await screen.findByText('Disable'));
    expect(await screen.findByText('Disable User')).toBeInTheDocument();
    expect(screen.getByText(/prevent test@example.com from logging in/i)).toBeInTheDocument();
  });

  it('should open confirmation dialog with Enable title when Enable is clicked', async () => {
    render(<UserActions user={buildUser({ isDisabled: true })} onActionComplete={noop} />);
    await userEvent.click(screen.getByRole('button'));
    await userEvent.click(await screen.findByText('Enable'));
    expect(await screen.findByText('Enable User')).toBeInTheDocument();
  });

  it('should open Promote to Admin confirmation dialog', async () => {
    render(<UserActions user={buildUser({ role: 'USER' })} onActionComplete={noop} />);
    await userEvent.click(screen.getByRole('button'));
    await userEvent.click(await screen.findByText('Promote to Admin'));
    expect(await screen.findByText('Promote to Admin')).toBeInTheDocument();
    expect(screen.getByText(/full admin access/i)).toBeInTheDocument();
  });

  it('should open Demote to User confirmation dialog', async () => {
    render(<UserActions user={buildUser({ role: 'ADMIN' })} onActionComplete={noop} />);
    await userEvent.click(screen.getByRole('button'));
    await userEvent.click(await screen.findByText('Demote to User'));
    expect(await screen.findByText('Demote to User')).toBeInTheDocument();
  });

  it('should open Reset Password confirmation dialog', async () => {
    render(<UserActions user={buildUser()} onActionComplete={noop} />);
    await userEvent.click(screen.getByRole('button'));
    await userEvent.click(await screen.findByText('Reset Password'));
    expect(await screen.findByText('Force Password Reset')).toBeInTheDocument();
  });

  it('should open Delete User confirmation dialog', async () => {
    render(<UserActions user={buildUser()} onActionComplete={noop} />);
    await userEvent.click(screen.getByRole('button'));
    await userEvent.click(await screen.findByText('Delete User'));
    expect(await screen.findByText('Delete User')).toBeInTheDocument();
    expect(screen.getByText(/permanently delete/i)).toBeInTheDocument();
  });

  it('should call toggleUserStatus(true) and onActionComplete after confirming Disable', async () => {
    const onActionComplete = vi.fn();
    mockToggle.mockResolvedValue({});
    render(<UserActions user={buildUser({ isDisabled: false })} onActionComplete={onActionComplete} />);
    await userEvent.click(screen.getByRole('button'));
    await userEvent.click(await screen.findByText('Disable'));
    await userEvent.click(await screen.findByRole('button', { name: 'Confirm' }));
    await waitFor(() => expect(mockToggle).toHaveBeenCalledWith('user-abc', true));
    await waitFor(() => expect(onActionComplete).toHaveBeenCalled());
  });

  it('should call toggleUserStatus(false) and onActionComplete after confirming Enable', async () => {
    const onActionComplete = vi.fn();
    mockToggle.mockResolvedValue({});
    render(<UserActions user={buildUser({ isDisabled: true })} onActionComplete={onActionComplete} />);
    await userEvent.click(screen.getByRole('button'));
    await userEvent.click(await screen.findByText('Enable'));
    await userEvent.click(await screen.findByRole('button', { name: 'Confirm' }));
    await waitFor(() => expect(mockToggle).toHaveBeenCalledWith('user-abc', false));
    await waitFor(() => expect(onActionComplete).toHaveBeenCalled());
  });

  it('should call promoteUser and onActionComplete after confirming promotion', async () => {
    const onActionComplete = vi.fn();
    mockPromote.mockResolvedValue({});
    render(<UserActions user={buildUser({ role: 'USER' })} onActionComplete={onActionComplete} />);
    await userEvent.click(screen.getByRole('button'));
    await userEvent.click(await screen.findByText('Promote to Admin'));
    await userEvent.click(await screen.findByRole('button', { name: 'Confirm' }));
    await waitFor(() => expect(mockPromote).toHaveBeenCalledWith('user-abc'));
    await waitFor(() => expect(onActionComplete).toHaveBeenCalled());
  });

  it('should call demoteUser and onActionComplete after confirming demotion', async () => {
    const onActionComplete = vi.fn();
    mockDemote.mockResolvedValue({});
    render(<UserActions user={buildUser({ role: 'ADMIN' })} onActionComplete={onActionComplete} />);
    await userEvent.click(screen.getByRole('button'));
    await userEvent.click(await screen.findByText('Demote to User'));
    await userEvent.click(await screen.findByRole('button', { name: 'Confirm' }));
    await waitFor(() => expect(mockDemote).toHaveBeenCalledWith('user-abc'));
    await waitFor(() => expect(onActionComplete).toHaveBeenCalled());
  });

  it('should call forceResetPassword and onActionComplete after confirming reset', async () => {
    const onActionComplete = vi.fn();
    mockReset.mockResolvedValue({});
    render(<UserActions user={buildUser()} onActionComplete={onActionComplete} />);
    await userEvent.click(screen.getByRole('button'));
    await userEvent.click(await screen.findByText('Reset Password'));
    await userEvent.click(await screen.findByRole('button', { name: 'Confirm' }));
    await waitFor(() => expect(mockReset).toHaveBeenCalledWith('user-abc'));
    await waitFor(() => expect(onActionComplete).toHaveBeenCalled());
  });

  it('should call deleteUser and onActionComplete after confirming deletion', async () => {
    const onActionComplete = vi.fn();
    mockDelete.mockResolvedValue({});
    render(<UserActions user={buildUser()} onActionComplete={onActionComplete} />);
    await userEvent.click(screen.getByRole('button'));
    await userEvent.click(await screen.findByText('Delete User'));
    await userEvent.click(await screen.findByRole('button', { name: 'Confirm' }));
    await waitFor(() => expect(mockDelete).toHaveBeenCalledWith('user-abc'));
    await waitFor(() => expect(onActionComplete).toHaveBeenCalled());
  });

  it('should close the dialog when Cancel is clicked', async () => {
    render(<UserActions user={buildUser()} onActionComplete={noop} />);
    await userEvent.click(screen.getByRole('button'));
    await userEvent.click(await screen.findByText('Delete User'));
    expect(await screen.findByText('Delete User')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    await waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument());
  });
});
