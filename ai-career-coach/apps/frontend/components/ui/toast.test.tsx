import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ToastContainer } from './toast';
import type { ToastMessage } from './toast';

beforeEach(() => {
  vi.clearAllMocks();
  vi.useFakeTimers();
});

afterEach(() => {
  vi.runOnlyPendingTimers();
  vi.useRealTimers();
});

function buildToast(overrides: Partial<ToastMessage> = {}): ToastMessage {
  return {
    id: 'toast-1',
    message: 'Test notification',
    variant: 'default',
    duration: 4000,
    ...overrides,
  };
}

describe('ToastContainer - empty state', () => {
  it('should render nothing when toasts array is empty', () => {
    const { container } = render(<ToastContainer toasts={[]} onDismiss={vi.fn()} />);
    expect(container.firstChild).toBeNull();
  });
});

describe('ToastContainer - rendering toasts', () => {
  it('should render a toast message', () => {
    const toast = buildToast({ message: 'Upload complete' });
    render(<ToastContainer toasts={[toast]} onDismiss={vi.fn()} />);
    expect(screen.getByText('Upload complete')).toBeInTheDocument();
  });

  it('should render multiple toasts', () => {
    const toasts: ToastMessage[] = [
      buildToast({ id: 'a', message: 'First toast' }),
      buildToast({ id: 'b', message: 'Second toast' }),
    ];
    render(<ToastContainer toasts={toasts} onDismiss={vi.fn()} />);
    expect(screen.getByText('First toast')).toBeInTheDocument();
    expect(screen.getByText('Second toast')).toBeInTheDocument();
  });

  it('should render a container with aria-label="Notifications"', () => {
    const toast = buildToast();
    render(<ToastContainer toasts={[toast]} onDismiss={vi.fn()} />);
    expect(screen.getByLabelText('Notifications')).toBeInTheDocument();
  });

  it('should render the toast with role="alert"', () => {
    const toast = buildToast({ message: 'Alert toast' });
    render(<ToastContainer toasts={[toast]} onDismiss={vi.fn()} />);
    expect(screen.getByRole('alert')).toBeInTheDocument();
  });

  it('should render a dismiss button for each toast', () => {
    const toast = buildToast();
    render(<ToastContainer toasts={[toast]} onDismiss={vi.fn()} />);
    expect(screen.getByLabelText('Dismiss notification')).toBeInTheDocument();
  });
});

describe('ToastContainer - variant styling', () => {
  it('should apply success variant class for success toasts', () => {
    const toast = buildToast({ variant: 'success', message: 'Saved!' });
    render(<ToastContainer toasts={[toast]} onDismiss={vi.fn()} />);
    const alertEl = screen.getByRole('alert');
    expect(alertEl.className).toContain('bg-green-900');
  });

  it('should apply error variant class for error toasts', () => {
    const toast = buildToast({ variant: 'error', message: 'Failed!' });
    render(<ToastContainer toasts={[toast]} onDismiss={vi.fn()} />);
    const alertEl = screen.getByRole('alert');
    expect(alertEl.className).toContain('bg-red-900');
  });

  it('should apply warning variant class for warning toasts', () => {
    const toast = buildToast({ variant: 'warning', message: 'Be careful!' });
    render(<ToastContainer toasts={[toast]} onDismiss={vi.fn()} />);
    const alertEl = screen.getByRole('alert');
    expect(alertEl.className).toContain('bg-yellow-900');
  });

  it('should apply default variant class when variant is "default"', () => {
    const toast = buildToast({ variant: 'default', message: 'Default notice' });
    render(<ToastContainer toasts={[toast]} onDismiss={vi.fn()} />);
    const alertEl = screen.getByRole('alert');
    expect(alertEl.className).toContain('bg-card');
  });

  it('should apply default variant class when variant is omitted', () => {
    const toast: ToastMessage = { id: 'x', message: 'No variant' };
    render(<ToastContainer toasts={[toast]} onDismiss={vi.fn()} />);
    const alertEl = screen.getByRole('alert');
    expect(alertEl.className).toContain('bg-card');
  });
});

describe('ToastContainer - dismiss interaction', () => {
  it('should call onDismiss with the toast id when dismiss button is clicked', async () => {
    const onDismiss = vi.fn();
    const toast = buildToast({ id: 'dismiss-me' });
    render(<ToastContainer toasts={[toast]} onDismiss={onDismiss} />);

    await act(async () => {
      await userEvent.click(screen.getByLabelText('Dismiss notification'));
    });

    act(() => {
      vi.advanceTimersByTime(400);
    });

    expect(onDismiss).toHaveBeenCalledWith('dismiss-me');
  });
});

describe('ToastContainer - auto dismiss', () => {
  it('should call onDismiss automatically after the toast duration elapses', () => {
    const onDismiss = vi.fn();
    const toast = buildToast({ id: 'auto-dismiss', duration: 2000 });
    render(<ToastContainer toasts={[toast]} onDismiss={onDismiss} />);

    act(() => {
      vi.advanceTimersByTime(2000 + 400);
    });

    expect(onDismiss).toHaveBeenCalledWith('auto-dismiss');
  });

  it('should use 4000ms as default duration when duration is omitted', () => {
    const onDismiss = vi.fn();
    const toast: ToastMessage = { id: 'default-duration', message: 'Timing test' };
    render(<ToastContainer toasts={[toast]} onDismiss={onDismiss} />);

    act(() => {
      vi.advanceTimersByTime(3999);
    });
    expect(onDismiss).not.toHaveBeenCalled();

    act(() => {
      vi.advanceTimersByTime(400);
    });
    expect(onDismiss).toHaveBeenCalledWith('default-duration');
  });
});
