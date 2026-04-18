import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AppLayout } from './AppLayout';

vi.mock('next/navigation', () => ({
  usePathname: vi.fn(() => '/dashboard'),
}));

vi.mock('next/image', () => ({
  default: ({ src, alt }: { src: string; alt: string }) => <img src={src} alt={alt} />,
}));

vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
      <div {...props}>{children}</div>
    ),
    span: ({ children, ...props }: React.HTMLAttributes<HTMLSpanElement>) => (
      <span {...props}>{children}</span>
    ),
  },
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock('../../context/authContext', () => ({
  useAuth: vi.fn(() => ({
    user: { id: '1', email: 'user@example.com', firstName: 'Test', lastName: 'User', isEmailVerified: true, role: 'USER' },
    isAdmin: false,
    logout: vi.fn(),
  })),
}));

vi.mock('../../hooks/useIsMobile', () => ({
  useIsMobile: vi.fn(() => false),
}));

vi.mock('../ui/sheet', () => ({
  Sheet: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SheetContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock('../command-palette/CommandPalette', () => ({
  CommandPalette: () => null,
}));

vi.mock('next/navigation', () => ({
  usePathname: vi.fn(() => '/dashboard'),
  useRouter: vi.fn(() => ({ push: vi.fn() })),
}));

vi.mock('next-themes', () => ({
  useTheme: vi.fn(() => ({ theme: 'light', setTheme: vi.fn() })),
}));

vi.mock('../../library/config', () => ({
  API_BASE_URL: 'http://localhost:4000/api',
}));

describe('AppLayout - rendering', () => {
  it('should render children in the main content area', () => {
    render(
      <AppLayout>
        <p>Page content</p>
      </AppLayout>
    );
    expect(screen.getByText('Page content')).toBeInTheDocument();
  });

  it('should render the main content landmark', () => {
    render(
      <AppLayout>
        <span>Hello</span>
      </AppLayout>
    );
    expect(screen.getByRole('main')).toBeInTheDocument();
  });

  it('should render the sidebar aside element', () => {
    render(
      <AppLayout>
        <span>Content</span>
      </AppLayout>
    );
    expect(screen.getByRole('complementary')).toBeInTheDocument();
  });

  it('should render the top navigation header', () => {
    render(
      <AppLayout>
        <span>Content</span>
      </AppLayout>
    );
    expect(screen.getByRole('banner')).toBeInTheDocument();
  });
});

describe('AppLayout - sidebar collapse', () => {
  it('should start with the sidebar expanded and apply wide padding class', () => {
    const { container } = render(
      <AppLayout>
        <span>Content</span>
      </AppLayout>
    );
    const contentWrapper = container.querySelector('.md\\:pl-60');
    expect(contentWrapper).toBeInTheDocument();
  });

  it('should apply narrow padding class after collapse toggle is clicked', async () => {
    const { container } = render(
      <AppLayout>
        <span>Content</span>
      </AppLayout>
    );
    const collapseButton = screen.getByRole('button', { name: '' });
    await userEvent.click(collapseButton);
    const collapsedWrapper = container.querySelector('.md\\:pl-16');
    expect(collapsedWrapper).toBeInTheDocument();
  });
});
