import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Badge } from './badge';

describe('Badge', () => {
  it('should render its text content', () => {
    render(<Badge>New</Badge>);
    expect(screen.getByText('New')).toBeInTheDocument();
  });

  it('should render as a div element', () => {
    render(<Badge>Label</Badge>);
    const badge = screen.getByText('Label');
    expect(badge.tagName.toLowerCase()).toBe('div');
  });

  it('should apply default variant classes when no variant is specified', () => {
    render(<Badge>Default</Badge>);
    const badge = screen.getByText('Default');
    expect(badge.className).toContain('bg-primary');
  });

  it('should apply secondary variant classes when variant="secondary"', () => {
    render(<Badge variant="secondary">Secondary</Badge>);
    const badge = screen.getByText('Secondary');
    expect(badge.className).toContain('bg-secondary');
  });

  it('should apply destructive variant classes when variant="destructive"', () => {
    render(<Badge variant="destructive">Error</Badge>);
    const badge = screen.getByText('Error');
    expect(badge.className).toContain('bg-destructive');
  });

  it('should apply outline variant classes when variant="outline"', () => {
    render(<Badge variant="outline">Outline</Badge>);
    const badge = screen.getByText('Outline');
    expect(badge.className).toContain('text-foreground');
  });

  it('should merge a custom className with variant classes', () => {
    render(<Badge className="my-badge">Custom</Badge>);
    const badge = screen.getByText('Custom');
    expect(badge.className).toContain('my-badge');
  });
});
