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

import { Footer } from './Footer';

describe('Footer', () => {
  it('should render the logo image with the correct alt text', () => {
    render(<Footer />);
    expect(screen.getByAltText('Build Your Career')).toBeInTheDocument();
  });

  it('should render the logo image from /LOGO.png', () => {
    render(<Footer />);
    const logo = screen.getByAltText('Build Your Career');
    expect(logo).toHaveAttribute('src', '/LOGO.png');
  });

  it('should render the "Features" anchor link pointing to #features', () => {
    render(<Footer />);
    const featuresLink = screen.getByRole('link', { name: 'Features' });
    expect(featuresLink).toHaveAttribute('href', '#features');
  });

  it('should render the "How it works" anchor link pointing to #how-it-works', () => {
    render(<Footer />);
    const howItWorksLink = screen.getByRole('link', { name: 'How it works' });
    expect(howItWorksLink).toHaveAttribute('href', '#how-it-works');
  });

  it('should render the "Sign in" link pointing to /auth/login', () => {
    render(<Footer />);
    const signInLink = screen.getByRole('link', { name: 'Sign in' });
    expect(signInLink).toHaveAttribute('href', '/auth/login');
  });

  it('should render the "Sign up" link pointing to /auth/register', () => {
    render(<Footer />);
    const signUpLink = screen.getByRole('link', { name: 'Sign up' });
    expect(signUpLink).toHaveAttribute('href', '/auth/register');
  });

  it('should render the copyright notice with the current year', () => {
    render(<Footer />);
    const currentYear = new Date().getFullYear().toString();
    expect(screen.getByText(new RegExp(currentYear))).toBeInTheDocument();
  });

  it('should render "Build Your Career" in the copyright text', () => {
    render(<Footer />);
    expect(screen.getByText(/Build Your Career/i)).toBeInTheDocument();
  });

  it('should render inside a footer element', () => {
    const { container } = render(<Footer />);
    expect(container.querySelector('footer')).toBeInTheDocument();
  });
});
