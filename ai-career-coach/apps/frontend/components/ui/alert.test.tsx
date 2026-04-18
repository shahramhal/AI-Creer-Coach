import { render, screen } from '@testing-library/react';
import { Alert, AlertTitle, AlertDescription } from './alert';

describe('Alert', () => {
  it('should render with role="alert"', () => {
    render(<Alert>Something went wrong</Alert>);
    expect(screen.getByRole('alert')).toBeInTheDocument();
  });

  it('should render children content', () => {
    render(<Alert>Check your input</Alert>);
    expect(screen.getByText('Check your input')).toBeInTheDocument();
  });

  it('should apply default variant classes when no variant is specified', () => {
    render(<Alert>Default alert</Alert>);
    const alertEl = screen.getByRole('alert');
    expect(alertEl.className).toContain('bg-background');
    expect(alertEl.className).toContain('text-foreground');
  });

  it('should apply destructive variant classes when variant="destructive"', () => {
    render(<Alert variant="destructive">Error alert</Alert>);
    const alertEl = screen.getByRole('alert');
    expect(alertEl.className).toContain('border-destructive');
    expect(alertEl.className).toContain('text-destructive');
  });

  it('should apply warning variant classes when variant="warning"', () => {
    render(<Alert variant="warning">Warning alert</Alert>);
    const alertEl = screen.getByRole('alert');
    expect(alertEl.className).toContain('border-red-500');
    expect(alertEl.className).toContain('text-red-600');
  });

  it('should forward a custom className', () => {
    render(<Alert className="custom-alert">With class</Alert>);
    const alertEl = screen.getByRole('alert');
    expect(alertEl.className).toContain('custom-alert');
  });

  it('should forward additional HTML attributes', () => {
    render(<Alert data-testid="my-alert">Attribute forwarding</Alert>);
    expect(screen.getByTestId('my-alert')).toBeInTheDocument();
  });
});

describe('AlertTitle', () => {
  it('should render as an h5 element', () => {
    render(<AlertTitle>Title text</AlertTitle>);
    const titleEl = screen.getByText('Title text');
    expect(titleEl.tagName.toLowerCase()).toBe('h5');
  });

  it('should render its text content', () => {
    render(<AlertTitle>My Alert Title</AlertTitle>);
    expect(screen.getByText('My Alert Title')).toBeInTheDocument();
  });

  it('should forward a custom className', () => {
    render(<AlertTitle className="title-class">Title</AlertTitle>);
    const titleEl = screen.getByText('Title');
    expect(titleEl.className).toContain('title-class');
  });

  it('should include font-medium in its default classes', () => {
    render(<AlertTitle>Font check</AlertTitle>);
    const titleEl = screen.getByText('Font check');
    expect(titleEl.className).toContain('font-medium');
  });
});

describe('AlertDescription', () => {
  it('should render its text content', () => {
    render(<AlertDescription>Description text</AlertDescription>);
    expect(screen.getByText('Description text')).toBeInTheDocument();
  });

  it('should render as a div element', () => {
    render(<AlertDescription>Description</AlertDescription>);
    const descEl = screen.getByText('Description');
    expect(descEl.tagName.toLowerCase()).toBe('div');
  });

  it('should forward a custom className', () => {
    render(<AlertDescription className="desc-class">Desc</AlertDescription>);
    const descEl = screen.getByText('Desc');
    expect(descEl.className).toContain('desc-class');
  });

  it('should include text-sm in its default classes', () => {
    render(<AlertDescription>Size check</AlertDescription>);
    const descEl = screen.getByText('Size check');
    expect(descEl.className).toContain('text-sm');
  });
});

describe('Alert composition', () => {
  it('should render Alert with both AlertTitle and AlertDescription', () => {
    render(
      <Alert>
        <AlertTitle>Operation failed</AlertTitle>
        <AlertDescription>Please try again later</AlertDescription>
      </Alert>
    );
    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(screen.getByText('Operation failed')).toBeInTheDocument();
    expect(screen.getByText('Please try again later')).toBeInTheDocument();
  });

  it('should render destructive alert with title and description', () => {
    render(
      <Alert variant="destructive">
        <AlertTitle>Account error</AlertTitle>
        <AlertDescription>Your session has expired</AlertDescription>
      </Alert>
    );
    const alertEl = screen.getByRole('alert');
    expect(alertEl.className).toContain('text-destructive');
    expect(screen.getByText('Account error')).toBeInTheDocument();
    expect(screen.getByText('Your session has expired')).toBeInTheDocument();
  });
});
