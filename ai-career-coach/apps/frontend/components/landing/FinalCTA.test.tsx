import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('next/link', () => ({
  default: ({ href, children, className }: any) => (
    <a href={href} className={className}>{children}</a>
  ),
}));

vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, className, ...props }: any) => (
      <div className={className} {...props}>{children}</div>
    ),
    section: ({ children, className, id, ...props }: any) => (
      <section className={className} id={id} {...props}>{children}</section>
    ),
  },
  useInView: () => true,
  useAnimation: () => ({}),
}));

import { FinalCTA } from './FinalCTA';

describe('FinalCTA', () => {
  it('should render the main heading', () => {
    render(<FinalCTA />);
    expect(screen.getByText(/Ready to take control/i)).toBeInTheDocument();
  });

  it('should render the gradient heading fragment "of your career?"', () => {
    render(<FinalCTA />);
    expect(screen.getByText('of your career?')).toBeInTheDocument();
  });

  it('should render the supporting paragraph', () => {
    render(<FinalCTA />);
    expect(screen.getByText(/Start analyzing your CV in under two minutes/i)).toBeInTheDocument();
  });

  it('should render a link to /auth/register', () => {
    render(<FinalCTA />);
    const ctaLink = screen.getByRole('link', { name: /Get started/i });
    expect(ctaLink).toHaveAttribute('href', '/auth/register');
  });

  it('should render the fine print text with "No credit card required"', () => {
    render(<FinalCTA />);
    const matches = screen.getAllByText(/No credit card required/i);
    expect(matches.length).toBeGreaterThan(0);
  });
});
