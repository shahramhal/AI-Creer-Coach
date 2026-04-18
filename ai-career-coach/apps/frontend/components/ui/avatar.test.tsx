import { vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Avatar, AvatarImage, AvatarFallback } from './avatar';

vi.mock('@radix-ui/react-avatar', () => {
  const React = require('react');

  const Root = React.forwardRef(
    ({ className, ...props }: React.HTMLAttributes<HTMLSpanElement>, ref: React.Ref<HTMLSpanElement>) =>
      React.createElement('span', { ref, className, ...props })
  );
  Root.displayName = 'AvatarRoot';

  const Image = React.forwardRef(
    (
      { className, src, alt, ...props }: React.ImgHTMLAttributes<HTMLImageElement>,
      ref: React.Ref<HTMLImageElement>
    ) => React.createElement('img', { ref, className, src, alt, ...props })
  );
  Image.displayName = 'AvatarImage';

  const Fallback = React.forwardRef(
    ({ className, ...props }: React.HTMLAttributes<HTMLSpanElement>, ref: React.Ref<HTMLSpanElement>) =>
      React.createElement('span', { ref, className, ...props })
  );
  Fallback.displayName = 'AvatarFallback';

  return { Root, Image, Fallback };
});

beforeEach(() => {
  vi.clearAllMocks();
});

describe('Avatar', () => {
  it('should render without crashing', () => {
    render(<Avatar data-testid="avatar-root" />);
    expect(screen.getByTestId('avatar-root')).toBeInTheDocument();
  });

  it('should include overflow-hidden and rounded-full in default classes', () => {
    render(<Avatar data-testid="avatar-root" />);
    const avatarEl = screen.getByTestId('avatar-root');
    expect(avatarEl.className).toContain('overflow-hidden');
    expect(avatarEl.className).toContain('rounded-full');
  });

  it('should forward a custom className', () => {
    render(<Avatar className="avatar-custom" data-testid="avatar-root" />);
    const avatarEl = screen.getByTestId('avatar-root');
    expect(avatarEl.className).toContain('avatar-custom');
  });

  it('should forward additional HTML attributes', () => {
    render(<Avatar data-testid="my-avatar" aria-label="User avatar" />);
    const avatarEl = screen.getByTestId('my-avatar');
    expect(avatarEl).toHaveAttribute('aria-label', 'User avatar');
  });
});

describe('AvatarFallback', () => {
  it('should render its text content', () => {
    render(
      <Avatar>
        <AvatarFallback>AB</AvatarFallback>
      </Avatar>
    );
    expect(screen.getByText('AB')).toBeInTheDocument();
  });

  it('should include rounded-full and bg-muted in its default classes', () => {
    render(
      <Avatar>
        <AvatarFallback data-testid="avatar-fallback">JD</AvatarFallback>
      </Avatar>
    );
    const fallbackEl = screen.getByTestId('avatar-fallback');
    expect(fallbackEl.className).toContain('rounded-full');
    expect(fallbackEl.className).toContain('bg-muted');
  });

  it('should forward a custom className', () => {
    render(
      <Avatar>
        <AvatarFallback className="fallback-custom" data-testid="avatar-fallback">XX</AvatarFallback>
      </Avatar>
    );
    const fallbackEl = screen.getByTestId('avatar-fallback');
    expect(fallbackEl.className).toContain('fallback-custom');
  });

  it('should render initials for a user with no image', () => {
    render(
      <Avatar>
        <AvatarFallback>SH</AvatarFallback>
      </Avatar>
    );
    expect(screen.getByText('SH')).toBeInTheDocument();
  });
});

describe('AvatarImage', () => {
  it('should render with the provided src attribute', () => {
    render(
      <Avatar>
        <AvatarImage src="https://example.com/photo.jpg" alt="Profile photo" />
      </Avatar>
    );
    const imgEl = screen.getByRole('img');
    expect(imgEl).toHaveAttribute('src', 'https://example.com/photo.jpg');
  });

  it('should render with the provided alt attribute', () => {
    render(
      <Avatar>
        <AvatarImage src="https://example.com/photo.jpg" alt="Profile photo" />
      </Avatar>
    );
    expect(screen.getByAltText('Profile photo')).toBeInTheDocument();
  });

  it('should include aspect-square and h-full in its default classes', () => {
    render(
      <Avatar>
        <AvatarImage src="https://example.com/photo.jpg" alt="Photo" data-testid="avatar-img" />
      </Avatar>
    );
    const imgEl = screen.getByTestId('avatar-img');
    expect(imgEl.className).toContain('aspect-square');
    expect(imgEl.className).toContain('h-full');
  });

  it('should forward a custom className', () => {
    render(
      <Avatar>
        <AvatarImage
          src="https://example.com/photo.jpg"
          alt="Photo"
          className="img-custom"
          data-testid="avatar-img"
        />
      </Avatar>
    );
    const imgEl = screen.getByTestId('avatar-img');
    expect(imgEl.className).toContain('img-custom');
  });
});

describe('Avatar composition', () => {
  it('should render Avatar with image and fallback together', () => {
    render(
      <Avatar>
        <AvatarImage src="https://example.com/photo.jpg" alt="Jane Doe" />
        <AvatarFallback>JD</AvatarFallback>
      </Avatar>
    );
    expect(screen.getByRole('img')).toBeInTheDocument();
    expect(screen.getByText('JD')).toBeInTheDocument();
  });

  it('should show initials when no image src is provided', () => {
    render(
      <Avatar>
        <AvatarFallback>MK</AvatarFallback>
      </Avatar>
    );
    expect(screen.getByText('MK')).toBeInTheDocument();
  });
});
