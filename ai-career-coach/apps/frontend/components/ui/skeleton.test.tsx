import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { Skeleton } from './skeleton';

describe('Skeleton', () => {
  it('should render a div with the animate-pulse class', () => {
    const { container } = render(<Skeleton />);
    const skeleton = container.firstChild as HTMLElement;
    expect(skeleton).toBeInTheDocument();
    expect(skeleton.className).toContain('animate-pulse');
  });

  it('should render a div with the rounded-md class', () => {
    const { container } = render(<Skeleton />);
    const skeleton = container.firstChild as HTMLElement;
    expect(skeleton.className).toContain('rounded-md');
  });

  it('should merge a custom className with the default classes', () => {
    const { container } = render(<Skeleton className="h-12 w-full" />);
    const skeleton = container.firstChild as HTMLElement;
    expect(skeleton.className).toContain('h-12');
    expect(skeleton.className).toContain('w-full');
    expect(skeleton.className).toContain('animate-pulse');
  });

  it('should render multiple skeletons independently', () => {
    const { container } = render(
      <div>
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-4 w-48" />
        <Skeleton className="h-4 w-24" />
      </div>
    );
    const skeletons = container.querySelectorAll('.animate-pulse');
    expect(skeletons).toHaveLength(3);
  });
});
