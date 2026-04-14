import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from './card';

describe('Card', () => {
  it('should render its children', () => {
    render(<Card>Card body</Card>);
    expect(screen.getByText('Card body')).toBeInTheDocument();
  });

  it('should include border and rounded classes', () => {
    const { container } = render(<Card />);
    const card = container.firstChild as HTMLElement;
    expect(card.className).toContain('rounded-lg');
    expect(card.className).toContain('border');
  });

  it('should merge a custom className', () => {
    const { container } = render(<Card className="my-card" />);
    const card = container.firstChild as HTMLElement;
    expect(card.className).toContain('my-card');
  });
});

describe('CardHeader', () => {
  it('should render its children', () => {
    render(<CardHeader>Header content</CardHeader>);
    expect(screen.getByText('Header content')).toBeInTheDocument();
  });
});

describe('CardTitle', () => {
  it('should render as an h3 element', () => {
    render(<CardTitle>My Title</CardTitle>);
    const heading = screen.getByRole('heading', { level: 3, name: 'My Title' });
    expect(heading).toBeInTheDocument();
  });
});

describe('CardDescription', () => {
  it('should render its text content', () => {
    render(<CardDescription>Some description here</CardDescription>);
    expect(screen.getByText('Some description here')).toBeInTheDocument();
  });
});

describe('CardContent', () => {
  it('should render its children', () => {
    render(<CardContent>Body text</CardContent>);
    expect(screen.getByText('Body text')).toBeInTheDocument();
  });
});

describe('CardFooter', () => {
  it('should render its children', () => {
    render(<CardFooter>Footer text</CardFooter>);
    expect(screen.getByText('Footer text')).toBeInTheDocument();
  });
});

describe('Card composition', () => {
  it('should render a full card with all sub-components', () => {
    render(
      <Card>
        <CardHeader>
          <CardTitle>Full Card</CardTitle>
          <CardDescription>A complete example</CardDescription>
        </CardHeader>
        <CardContent>Main content area</CardContent>
        <CardFooter>Footer area</CardFooter>
      </Card>
    );

    expect(screen.getByRole('heading', { name: 'Full Card' })).toBeInTheDocument();
    expect(screen.getByText('A complete example')).toBeInTheDocument();
    expect(screen.getByText('Main content area')).toBeInTheDocument();
    expect(screen.getByText('Footer area')).toBeInTheDocument();
  });
});
