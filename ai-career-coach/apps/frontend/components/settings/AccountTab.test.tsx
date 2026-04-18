import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AccountTab } from './AccountTab';

const mockUser = vi.hoisted(() => ({
  id: 'user-1',
  email: 'alice@example.com',
  firstName: 'Alice',
  lastName: 'Smith',
  isEmailVerified: true,
  role: 'USER' as const,
}));

vi.mock('@/context/authContext', () => ({
  useAuth: vi.fn().mockReturnValue({
    user: mockUser,
    refreshUser: vi.fn().mockResolvedValue(undefined),
    logout: vi.fn().mockResolvedValue(undefined),
  }),
}));

vi.mock('@/hooks/useToast', () => ({
  useToast: vi.fn().mockReturnValue({
    showSuccessToast: vi.fn(),
    showErrorToast: vi.fn(),
  }),
}));

vi.mock('@/services/settings.service', () => ({
  settingsService: {
    updateAccountInfo: vi.fn().mockResolvedValue(undefined),
    exportData: vi.fn(),
    deleteAccount: vi.fn().mockResolvedValue(undefined),
  },
}));

import { settingsService } from '@/services/settings.service';
import { useToast } from '@/hooks/useToast';

describe('AccountTab - rendering', () => {
  it('should render the "Profile Information" card', () => {
    render(<AccountTab />);
    expect(screen.getByText('Profile Information')).toBeInTheDocument();
  });

  it('should pre-fill the First Name input from the current user', () => {
    render(<AccountTab />);
    expect(screen.getByLabelText('First Name')).toHaveValue('Alice');
  });

  it('should pre-fill the Last Name input from the current user', () => {
    render(<AccountTab />);
    expect(screen.getByLabelText('Last Name')).toHaveValue('Smith');
  });

  it('should pre-fill and disable the Email input', () => {
    render(<AccountTab />);
    const emailInput = screen.getByLabelText('Email');
    expect(emailInput).toHaveValue('alice@example.com');
    expect(emailInput).toBeDisabled();
  });

  it('should render the "Data & Privacy" card', () => {
    render(<AccountTab />);
    expect(screen.getByText('Data & Privacy')).toBeInTheDocument();
  });

  it('should render the Export and Delete buttons', () => {
    render(<AccountTab />);
    expect(screen.getByRole('button', { name: 'Export' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Delete' })).toBeInTheDocument();
  });
});

describe('AccountTab - profile update', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should call settingsService.updateAccountInfo with updated names', async () => {
    render(<AccountTab />);

    const firstNameInput = screen.getByLabelText('First Name');
    await userEvent.clear(firstNameInput);
    await userEvent.type(firstNameInput, 'Alicia');

    await userEvent.click(screen.getByRole('button', { name: /update profile/i }));

    await waitFor(() => {
      expect(settingsService.updateAccountInfo).toHaveBeenCalledWith({
        firstName: 'Alicia',
        lastName: 'Smith',
      });
    });
  });

  it('should show a success toast on successful profile update', async () => {
    const { showSuccessToast } = vi.mocked(useToast)();
    render(<AccountTab />);

    await userEvent.click(screen.getByRole('button', { name: /update profile/i }));

    await waitFor(() => {
      expect(showSuccessToast).toHaveBeenCalled();
    });
  });

  it('should show an error toast when updateAccountInfo fails', async () => {
    vi.mocked(settingsService.updateAccountInfo).mockRejectedValue(new Error('Server error'));
    const { showErrorToast } = vi.mocked(useToast)();
    render(<AccountTab />);

    await userEvent.click(screen.getByRole('button', { name: /update profile/i }));

    await waitFor(() => {
      expect(showErrorToast).toHaveBeenCalled();
    });
  });

  it('should show "Updating..." text while the update is in progress', async () => {
    vi.mocked(settingsService.updateAccountInfo).mockImplementation(
      () => new Promise((resolve) => setTimeout(resolve, 1000))
    );
    render(<AccountTab />);

    await userEvent.click(screen.getByRole('button', { name: /update profile/i }));

    expect(screen.getByRole('button', { name: /updating/i })).toBeInTheDocument();
  });
});

describe('AccountTab - export data', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should trigger a file download when export succeeds', async () => {
    const mockBlob = new Blob(['{"data":"test"}'], { type: 'application/json' });
    vi.mocked(settingsService.exportData).mockResolvedValue(mockBlob);
    const createObjectURL = vi.fn().mockReturnValue('blob:url');
    const revokeObjectURL = vi.fn();
    Object.defineProperty(window, 'URL', {
      writable: true,
      value: { createObjectURL, revokeObjectURL },
    });

    render(<AccountTab />);

    // Spy AFTER render so the testing-library DOM insertion is not intercepted
    const appendChildSpy = vi.spyOn(document.body, 'appendChild').mockImplementation((child) => child as Node);
    const removeChildSpy = vi.spyOn(document.body, 'removeChild').mockImplementation((child) => child as Node);

    await userEvent.click(screen.getByRole('button', { name: /^export$/i }));

    await waitFor(() => {
      expect(settingsService.exportData).toHaveBeenCalled();
      expect(createObjectURL).toHaveBeenCalledWith(mockBlob);
    });

    appendChildSpy.mockRestore();
    removeChildSpy.mockRestore();
  });

  it('should show an error toast when export fails', async () => {
    vi.mocked(settingsService.exportData).mockRejectedValue(new Error('Export failed'));
    const { showErrorToast } = vi.mocked(useToast)();
    render(<AccountTab />);

    await userEvent.click(screen.getByRole('button', { name: /^export$/i }));

    await waitFor(() => {
      expect(showErrorToast).toHaveBeenCalled();
    });
  });
});

describe('AccountTab - delete account', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should open the delete confirmation dialog when the Delete button is clicked', async () => {
    render(<AccountTab />);
    await userEvent.click(screen.getByRole('button', { name: /^delete$/i }));

    expect(screen.getByText('Are you absolutely sure?')).toBeInTheDocument();
  });

  it('should keep the "Delete Account" action disabled when the confirmation name is wrong', async () => {
    render(<AccountTab />);
    await userEvent.click(screen.getByRole('button', { name: /^delete$/i }));

    const confirmInput = screen.getByLabelText(/Type/);
    await userEvent.type(confirmInput, 'Wrong Name');

    expect(screen.getByRole('button', { name: /delete account/i })).toBeDisabled();
  });

  it('should enable the "Delete Account" action when the correct full name is typed', async () => {
    render(<AccountTab />);
    await userEvent.click(screen.getByRole('button', { name: /^delete$/i }));

    const confirmInput = screen.getByLabelText(/Type/);
    await userEvent.type(confirmInput, 'Alice Smith');

    expect(screen.getByRole('button', { name: /delete account/i })).not.toBeDisabled();
  });
});
