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

vi.mock('framer-motion', () => ({
  motion: {
    nav: ({ children, className, ...props }: any) => (
      <nav className={className} {...props}>{children}</nav>
    ),
  },
}));

import { Navigation } from './Navigation';

describe('Navigation', () => {
  it('should render the logo image with the correct alt text', () => {
    render(<Navigation />);
    expect(screen.getByAltText('Build Your Career')).toBeInTheDocument();
  });

  it('should render the logo image sourced from /LOGO.png', () => {
    render(<Navigation />);
    const logo = screen.getByAltText('Build Your Career');
    expect(logo).toHaveAttribute('src', '/LOGO.png');
  });

  it('should render the logo as a link to the home page', () => {
    render(<Navigation />);
    const homeLink = screen.getByRole('link', { name: 'Build Your Career' });
    expect(homeLink).toHaveAttribute('href', '/');
  });

  it('should render a "Features" link pointing to #features', () => {
    render(<Navigation />);
    const featuresLink = screen.getByRole('link', { name: 'Features' });
    expect(featuresLink).toHaveAttribute('href', '#features');
  });

  it('should render a "How it works" link pointing to #how-it-works', () => {
    render(<Navigation />);
    const howItWorksLink = screen.getByRole('link', { name: 'How it works' });
    expect(howItWorksLink).toHaveAttribute('href', '#how-it-works');
  });

  it('should render a "Sign in" link pointing to /auth/login', () => {
    render(<Navigation />);
    const signInLink = screen.getByRole('link', { name: 'Sign in' });
    expect(signInLink).toHaveAttribute('href', '/auth/login');
  });

  it('should render a "Get started free" link pointing to /auth/register', () => {
    render(<Navigation />);
    const getStartedLink = screen.getByRole('link', { name: 'Get started free' });
    expect(getStartedLink).toHaveAttribute('href', '/auth/register');
  });

  it('should render inside a nav element', () => {
    const { container } = render(<Navigation />);
    expect(container.querySelector('nav')).toBeInTheDocument();
  });
});
