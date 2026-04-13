import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { UserTable } from './UserTable';
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

const buildUser = (overrides: Partial<AdminUser> = {}): AdminUser => ({
  id: 'user-1',
  email: 'alice@example.com',
  firstName: 'Alice',
  lastName: 'Smith',
  role: 'USER',
  isDisabled: false,
  isEmailVerified: true,
  lastLoginAt: null,
  createdAt: '2024-01-15T10:00:00Z',
  _count: { cvs: 3, applications: 7 },
  ...overrides,
});

const noop = () => {};

describe('UserTable', () => {
  it('should render skeleton rows while loading', () => {
    const { container } = render(
      <UserTable users={[]} loading={true} onRowClick={noop} onRefresh={noop} />
    );
    const skeletons = container.querySelectorAll('.animate-pulse');
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it('should show an empty state message when no users are returned', () => {
    render(<UserTable users={[]} loading={false} onRowClick={noop} onRefresh={noop} />);
    expect(screen.getByText('No users found')).toBeInTheDocument();
  });

  it('should render a row for each user', () => {
    const users = [buildUser(), buildUser({ id: 'user-2', email: 'bob@example.com' })];
    render(<UserTable users={users} loading={false} onRowClick={noop} onRefresh={noop} />);

    expect(screen.getByText('alice@example.com')).toBeInTheDocument();
    expect(screen.getByText('bob@example.com')).toBeInTheDocument();
  });

  it('should display the full name from firstName and lastName', () => {
    render(
      <UserTable
        users={[buildUser({ firstName: 'Alice', lastName: 'Smith' })]}
        loading={false}
        onRowClick={noop}
        onRefresh={noop}
      />
    );
    expect(screen.getByText('Alice Smith')).toBeInTheDocument();
  });

  it('should show a dash when user has no name', () => {
    render(
      <UserTable
        users={[buildUser({ firstName: null, lastName: null })]}
        loading={false}
        onRowClick={noop}
        onRefresh={noop}
      />
    );
    expect(screen.getByText('-')).toBeInTheDocument();
  });

  it('should show an "Active" badge for enabled users', () => {
    render(
      <UserTable
        users={[buildUser({ isDisabled: false })]}
        loading={false}
        onRowClick={noop}
        onRefresh={noop}
      />
    );
    expect(screen.getByText('Active')).toBeInTheDocument();
  });

  it('should show a "Disabled" badge for disabled users', () => {
    render(
      <UserTable
        users={[buildUser({ isDisabled: true })]}
        loading={false}
        onRowClick={noop}
        onRefresh={noop}
      />
    );
    expect(screen.getByText('Disabled')).toBeInTheDocument();
  });

  it('should display the USER or ADMIN role badge', () => {
    render(
      <UserTable
        users={[buildUser({ role: 'ADMIN' })]}
        loading={false}
        onRowClick={noop}
        onRefresh={noop}
      />
    );
    expect(screen.getByText('ADMIN')).toBeInTheDocument();
  });

  it('should call onRowClick with the user id when a row is clicked', async () => {
    const handleRowClick = vi.fn();
    render(
      <UserTable
        users={[buildUser({ id: 'user-abc' })]}
        loading={false}
        onRowClick={handleRowClick}
        onRefresh={noop}
      />
    );

    await userEvent.click(screen.getByText('alice@example.com'));
    expect(handleRowClick).toHaveBeenCalledWith('user-abc');
  });

  it('should render the CV count for each user', () => {
    render(
      <UserTable
        users={[buildUser({ _count: { cvs: 4, applications: 2 } })]}
        loading={false}
        onRowClick={noop}
        onRefresh={noop}
      />
    );
    expect(screen.getByText('4')).toBeInTheDocument();
  });
});
