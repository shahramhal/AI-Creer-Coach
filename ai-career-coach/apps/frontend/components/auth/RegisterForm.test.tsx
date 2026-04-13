import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import RegisterForm from './RegisterForm';

const mockRegisterUser = vi.fn();

vi.mock('next/link', () => ({
  default: ({ href, children }: { href: string; children: React.ReactNode }) => (
    <a href={href}>{children}</a>
  ),
}));

vi.mock('../../context/authContext', () => ({
  useAuth: vi.fn(),
}));

import { useAuth } from '../../context/authContext';

const mockUseAuth = useAuth as ReturnType<typeof vi.fn>;

async function fillValidForm() {
  await userEvent.type(screen.getByLabelText(/email address/i), 'jane@example.com');
  await userEvent.type(screen.getByLabelText(/^password\s*\*/i), 'Password1');
  await userEvent.type(screen.getByLabelText(/confirm password/i), 'Password1');
}

describe('RegisterForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAuth.mockReturnValue({ register: mockRegisterUser });
  });

  it('should render the registration form fields', () => {
    render(<RegisterForm />);
    expect(screen.getByLabelText(/first name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/last name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/email address/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^password\s*\*/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/confirm password/i)).toBeInTheDocument();
  });

  it('should render the "Create account" submit button', () => {
    render(<RegisterForm />);
    expect(screen.getByRole('button', { name: /create account/i })).toBeInTheDocument();
  });

  it('should render a link to the login page', () => {
    render(<RegisterForm />);
    expect(screen.getByRole('link', { name: /sign in/i })).toHaveAttribute('href', '/login');
  });

  it('should show an email required error when submitted with an empty email', async () => {
    render(<RegisterForm />);
    await userEvent.click(screen.getByRole('button', { name: /create account/i }));
    await waitFor(() => {
      expect(screen.getByText('Email is required')).toBeInTheDocument();
    });
  });

  it('should show a password min-length error for short passwords', async () => {
    render(<RegisterForm />);
    await userEvent.type(screen.getByLabelText(/email address/i), 'jane@example.com');
    await userEvent.type(screen.getByLabelText(/^password\s*\*/i), 'short');
    await userEvent.click(screen.getByRole('button', { name: /create account/i }));
    await waitFor(() => {
      expect(screen.getByText('Password must be at least 8 characters')).toBeInTheDocument();
    });
  });

  it('should show a password complexity error when the password lacks an uppercase letter', async () => {
    render(<RegisterForm />);
    await userEvent.type(screen.getByLabelText(/email address/i), 'jane@example.com');
    await userEvent.type(screen.getByLabelText(/^password\s*\*/i), 'alllower1');
    await userEvent.click(screen.getByRole('button', { name: /create account/i }));
    await waitFor(() => {
      expect(screen.getByText(/uppercase, lowercase, and number/i)).toBeInTheDocument();
    });
  });

  it('should show a confirm password error when passwords do not match', async () => {
    render(<RegisterForm />);
    await userEvent.type(screen.getByLabelText(/email address/i), 'jane@example.com');
    await userEvent.type(screen.getByLabelText(/^password\s*\*/i), 'Password1');
    await userEvent.type(screen.getByLabelText(/confirm password/i), 'Different1');
    await userEvent.click(screen.getByRole('button', { name: /create account/i }));
    await waitFor(() => {
      expect(screen.getByText('Passwords do not match')).toBeInTheDocument();
    });
  });

  it('should call the register function with the form data on valid submission', async () => {
    mockRegisterUser.mockResolvedValue(undefined);
    render(<RegisterForm />);

    await userEvent.type(screen.getByLabelText(/first name/i), 'Jane');
    await userEvent.type(screen.getByLabelText(/last name/i), 'Doe');
    await fillValidForm();
    await userEvent.click(screen.getByRole('button', { name: /create account/i }));

    await waitFor(() => {
      expect(mockRegisterUser).toHaveBeenCalledWith({
        email: 'jane@example.com',
        password: 'Password1',
        firstName: 'Jane',
        lastName: 'Doe',
      });
    });
  });

  it('should show the success screen after successful registration', async () => {
    mockRegisterUser.mockResolvedValue(undefined);
    render(<RegisterForm />);

    await fillValidForm();
    await userEvent.click(screen.getByRole('button', { name: /create account/i }));

    await waitFor(() => {
      expect(screen.getByText('Check your email')).toBeInTheDocument();
    });
  });

  it('should display the email address on the success screen', async () => {
    mockRegisterUser.mockResolvedValue(undefined);
    render(<RegisterForm />);

    await userEvent.type(screen.getByLabelText(/email address/i), 'signup@example.com');
    await userEvent.type(screen.getByLabelText(/^password\s*\*/i), 'Password1');
    await userEvent.type(screen.getByLabelText(/confirm password/i), 'Password1');
    await userEvent.click(screen.getByRole('button', { name: /create account/i }));

    await waitFor(() => {
      expect(screen.getByText('signup@example.com')).toBeInTheDocument();
    });
  });

  it('should show a generic error message when registration fails', async () => {
    mockRegisterUser.mockRejectedValue(new Error('Email already in use'));
    render(<RegisterForm />);

    await fillValidForm();
    await userEvent.click(screen.getByRole('button', { name: /create account/i }));

    await waitFor(() => {
      expect(screen.getByText('Email already in use')).toBeInTheDocument();
    });
  });
});
