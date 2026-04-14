import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import LoginForm from './LoginForm';

const mockRouterPush = vi.fn();
const mockLogin = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockRouterPush, replace: vi.fn() }),
  usePathname: () => '/login',
}));

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

describe('LoginForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAuth.mockReturnValue({ login: mockLogin });
  });

  it('should render the email and password fields', () => {
    render(<LoginForm />);
    expect(screen.getByLabelText(/email address/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^password$/i)).toBeInTheDocument();
  });

  it('should render the sign in button', () => {
    render(<LoginForm />);
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
  });

  it('should render a link to the register page', () => {
    render(<LoginForm />);
    expect(screen.getByRole('link', { name: /sign up/i })).toHaveAttribute('href', '/register');
  });

  it('should show an email validation error when the form is submitted with an empty email', async () => {
    render(<LoginForm />);
    await userEvent.click(screen.getByRole('button', { name: /sign in/i }));
    await waitFor(() => {
      expect(screen.getByText('Email is required')).toBeInTheDocument();
    });
  });

  it('should show an email format error when an invalid email is entered', async () => {
    render(<LoginForm />);
    // Use fireEvent.change so the value bypasses native HTML email constraint
    // validation in happy-dom, allowing react-hook-form + Zod to validate instead.
    fireEvent.change(screen.getByLabelText(/email address/i), {
      target: { value: 'not-an-email' },
    });
    fireEvent.submit(screen.getByRole('button', { name: /sign in/i }).closest('form')!);
    await waitFor(() => {
      expect(screen.getByText('Email is invalid')).toBeInTheDocument();
    });
  });

  it('should show a password required error when the form is submitted without a password', async () => {
    render(<LoginForm />);
    await userEvent.type(screen.getByLabelText(/email address/i), 'test@example.com');
    await userEvent.click(screen.getByRole('button', { name: /sign in/i }));
    await waitFor(() => {
      expect(screen.getByText('Password is required')).toBeInTheDocument();
    });
  });

  it('should call login with email and password on valid form submission', async () => {
    mockLogin.mockResolvedValue(undefined);
    render(<LoginForm />);

    await userEvent.type(screen.getByLabelText(/email address/i), 'user@example.com');
    await userEvent.type(screen.getByLabelText(/^password$/i), 'mysecret');
    await userEvent.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledWith('user@example.com', 'mysecret');
    });
  });

  it('should redirect to /dashboard after a successful login', async () => {
    mockLogin.mockResolvedValue(undefined);
    render(<LoginForm />);

    await userEvent.type(screen.getByLabelText(/email address/i), 'user@example.com');
    await userEvent.type(screen.getByLabelText(/^password$/i), 'mysecret');
    await userEvent.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => {
      expect(mockRouterPush).toHaveBeenCalledWith('/dashboard');
    });
  });

  it('should show a generic error message when login fails', async () => {
    mockLogin.mockRejectedValue(new Error('Login failed'));
    render(<LoginForm />);

    await userEvent.type(screen.getByLabelText(/email address/i), 'user@example.com');
    await userEvent.type(screen.getByLabelText(/^password$/i), 'wrongpassword');
    await userEvent.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => {
      expect(screen.getByText('Login failed')).toBeInTheDocument();
    });
  });

  it('should show a toggle button to reveal or hide the password', () => {
    render(<LoginForm />);
    const toggleButton = screen.getByRole('button', { name: '' });
    expect(toggleButton).toBeInTheDocument();
  });

  it('should toggle the password field between text and password type when the eye icon is clicked', async () => {
    render(<LoginForm />);
    const passwordInput = screen.getByLabelText(/^password$/i);
    expect(passwordInput).toHaveAttribute('type', 'password');

    const toggleButtons = screen.getAllByRole('button');
    const eyeButton = toggleButtons.find((btn) => btn.getAttribute('type') === 'button');
    await userEvent.click(eyeButton!);

    expect(passwordInput).toHaveAttribute('type', 'text');
  });
});
