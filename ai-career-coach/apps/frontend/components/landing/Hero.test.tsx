import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('next/link', () => ({
  default: ({ href, children, className }: any) => (
    <a href={href} className={className}>{children}</a>
  ),
}));

vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, className, style, ...props }: any) => (
      <div className={className} style={style} {...props}>{children}</div>
    ),
    h1: ({ children, className, ...props }: any) => (
      <h1 className={className} {...props}>{children}</h1>
    ),
    p: ({ children, className, ...props }: any) => (
      <p className={className} {...props}>{children}</p>
    ),
    nav: ({ children, className, ...props }: any) => (
      <nav className={className} {...props}>{children}</nav>
    ),
  },
  useScroll: () => ({ scrollYProgress: { get: () => 0 } }),
  useTransform: (_value: any, _from: any, _to: any) => 1,
  useInView: () => true,
}));

import { Hero } from './Hero';

describe('Hero', () => {
  it('should render the headline text "Your career,"', () => {
    render(<Hero />);
    expect(screen.getByText('Your career,')).toBeInTheDocument();
  });

  it('should render the gradient headline "accelerated."', () => {
    render(<Hero />);
    expect(screen.getByText('accelerated.')).toBeInTheDocument();
  });

  it('should render the sub-headline paragraph', () => {
    render(<Hero />);
    expect(screen.getByText(/AI-powered CV analysis/i)).toBeInTheDocument();
  });

  it('should render a "Start for free" link to /auth/register', () => {
    render(<Hero />);
    const ctaLink = screen.getByRole('link', { name: /Start for free/i });
    expect(ctaLink).toHaveAttribute('href', '/auth/register');
  });

  it('should render a "See how it works" anchor to #features', () => {
    render(<Hero />);
    const featuresLink = screen.getByRole('link', { name: /See how it works/i });
    expect(featuresLink).toHaveAttribute('href', '#features');
  });

  it('should render the "No credit card required" trust indicator', () => {
    render(<Hero />);
    expect(screen.getByText(/No credit card required/i)).toBeInTheDocument();
  });

  it('should render the "Setup in 2 minutes" trust indicator', () => {
    render(<Hero />);
    expect(screen.getByText(/Setup in 2 minutes/i)).toBeInTheDocument();
  });

  it('should render the "Intelligent career platform" badge', () => {
    render(<Hero />);
    expect(screen.getByText(/Intelligent career platform/i)).toBeInTheDocument();
  });
});
