import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('next/link', () => ({
  default: ({ href, children, className }: any) => (
    <a href={href} className={className}>{children}</a>
  ),
}));

vi.mock('next/image', () => ({
  default: ({ src, alt, className }: any) => (
    <img src={src} alt={alt} className={className} />
  ),
}));

import AuthLayout from './AuthLayout';

describe('AuthLayout - with logo (default)', () => {
  it('should render the title', () => {
    render(
      <AuthLayout title="Sign In">
        <p>Form content</p>
      </AuthLayout>
    );
    expect(screen.getByText('Sign In')).toBeInTheDocument();
  });

  it('should render children', () => {
    render(
      <AuthLayout title="Register">
        <button>Submit</button>
      </AuthLayout>
    );
    expect(screen.getByRole('button', { name: 'Submit' })).toBeInTheDocument();
  });

  it('should render the logo image by default', () => {
    render(
      <AuthLayout title="Login">
        <span />
      </AuthLayout>
    );
    expect(screen.getByAltText('Build Your Career')).toBeInTheDocument();
  });

  it('should render the logo image from /LOGO.png', () => {
    render(
      <AuthLayout title="Login">
        <span />
      </AuthLayout>
    );
    expect(screen.getByAltText('Build Your Career')).toHaveAttribute('src', '/LOGO.png');
  });

  it('should render the logo as a link to the home page', () => {
    render(
      <AuthLayout title="Login">
        <span />
      </AuthLayout>
    );
    const logoLink = screen.getByRole('link', { name: 'Build Your Career' });
    expect(logoLink).toHaveAttribute('href', '/');
  });

  it('should render the subtitle when provided', () => {
    render(
      <AuthLayout title="Welcome back" subtitle="Log in to continue">
        <span />
      </AuthLayout>
    );
    expect(screen.getByText('Log in to continue')).toBeInTheDocument();
  });

  it('should not render a subtitle element when subtitle is omitted', () => {
    render(
      <AuthLayout title="Welcome back">
        <span />
      </AuthLayout>
    );
    expect(screen.queryByText('Log in to continue')).not.toBeInTheDocument();
  });

  it('should render the Terms link', () => {
    render(
      <AuthLayout title="Register">
        <span />
      </AuthLayout>
    );
    const termsLink = screen.getByRole('link', { name: 'Terms' });
    expect(termsLink).toHaveAttribute('href', '/terms');
  });

  it('should render the Privacy Policy link', () => {
    render(
      <AuthLayout title="Register">
        <span />
      </AuthLayout>
    );
    const privacyLink = screen.getByRole('link', { name: 'Privacy Policy' });
    expect(privacyLink).toHaveAttribute('href', '/privacy');
  });

  it('should render the "By continuing" legal text', () => {
    render(
      <AuthLayout title="Sign up">
        <span />
      </AuthLayout>
    );
    expect(screen.getByText(/By continuing/i)).toBeInTheDocument();
  });
});

describe('AuthLayout - without logo', () => {
  it('should not render the logo image when showLogo is false', () => {
    render(
      <AuthLayout title="Headless form" showLogo={false}>
        <span />
      </AuthLayout>
    );
    expect(screen.queryByAltText('Build Your Career')).not.toBeInTheDocument();
  });

  it('should still render the title when showLogo is false', () => {
    render(
      <AuthLayout title="Headless form" showLogo={false}>
        <span />
      </AuthLayout>
    );
    expect(screen.getByText('Headless form')).toBeInTheDocument();
  });
});
