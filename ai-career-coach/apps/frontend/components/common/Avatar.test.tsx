import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import Avatar from './Avatar';

describe('Avatar', () => {
  it('should show initials when no avatarUrl is provided', () => {
    render(<Avatar firstName="Jane" lastName="Doe" />);
    expect(screen.getByText('JD')).toBeInTheDocument();
  });

  it('should show only the first initial when lastName is missing', () => {
    render(<Avatar firstName="Alice" />);
    expect(screen.getByText('A')).toBeInTheDocument();
  });

  it('should show "?" when neither firstName nor lastName is provided', () => {
    render(<Avatar />);
    expect(screen.getByText('?')).toBeInTheDocument();
  });

  it('should render an img element when avatarUrl is a full http URL', () => {
    render(<Avatar avatarUrl="https://example.com/avatar.jpg" firstName="Bob" lastName="Smith" />);
    const img = screen.getByRole('img');
    expect(img).toHaveAttribute('src', 'https://example.com/avatar.jpg');
  });

  it('should not render initials when an avatarUrl is provided', () => {
    render(<Avatar avatarUrl="https://example.com/avatar.jpg" firstName="Bob" lastName="Smith" />);
    expect(screen.queryByText('BS')).not.toBeInTheDocument();
  });

  it('should apply the correct size class for sm', () => {
    const { container } = render(<Avatar size="sm" firstName="A" />);
    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper.className).toContain('w-8');
  });

  it('should apply the correct size class for lg', () => {
    const { container } = render(<Avatar size="lg" firstName="A" />);
    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper.className).toContain('w-16');
  });

  it('should apply the default md size class when no size is specified', () => {
    const { container } = render(<Avatar firstName="A" />);
    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper.className).toContain('w-12');
  });

  it('should use uppercase initials', () => {
    render(<Avatar firstName="john" lastName="smith" />);
    expect(screen.getByText('JS')).toBeInTheDocument();
  });
});
