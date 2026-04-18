import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render } from '@testing-library/react';
import { WebVitalsReporter } from './WebVitalsReporter';

vi.mock('next/navigation', () => ({
  usePathname: vi.fn().mockReturnValue('/dashboard'),
}));

vi.mock('@/services/admin.service', () => ({
  adminService: {
    reportWebVitals: vi.fn().mockResolvedValue(undefined),
  },
}));

import { adminService } from '@/services/admin.service';
import { usePathname } from 'next/navigation';

describe('WebVitalsReporter - rendering', () => {
  it('should render null (no visible DOM output)', () => {
    const { container } = render(<WebVitalsReporter />);
    expect(container).toBeEmptyDOMElement();
  });
});

describe('WebVitalsReporter - vitals reporting', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();

    Object.defineProperty(window, 'performance', {
      writable: true,
      value: {
        getEntriesByType: vi.fn().mockImplementation((type: string) => {
          if (type === 'navigation') {
            return [
              {
                loadEventEnd: 1200,
                responseStart: 200,
                requestStart: 100,
                domContentLoadedEventEnd: 800,
                startTime: 0,
              },
            ];
          }
          if (type === 'paint') {
            return [
              { name: 'first-contentful-paint', startTime: 600 },
            ];
          }
          return [];
        }),
      },
    });

    global.PerformanceObserver = vi.fn(function(_callback: PerformanceObserverCallback) {
      return { observe: vi.fn(), disconnect: vi.fn() };
    }) as unknown as typeof PerformanceObserver;
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should call adminService.reportWebVitals after the 3-second timer fires', async () => {
    render(<WebVitalsReporter />);

    vi.advanceTimersByTime(3001);

    await vi.runAllTimersAsync();

    expect(adminService.reportWebVitals).toHaveBeenCalled();
  });

  it('should not call reportWebVitals before the 3-second timer fires', () => {
    render(<WebVitalsReporter />);

    vi.advanceTimersByTime(2000);

    expect(adminService.reportWebVitals).not.toHaveBeenCalled();
  });

  it('should cancel the timer on unmount (no call after unmount)', async () => {
    const { unmount } = render(<WebVitalsReporter />);
    unmount();

    vi.advanceTimersByTime(4000);
    await vi.runAllTimersAsync();

    expect(adminService.reportWebVitals).not.toHaveBeenCalled();
  });

  it('should re-run the effect when the pathname changes', async () => {
    vi.mocked(usePathname).mockReturnValue('/dashboard');

    const { rerender } = render(<WebVitalsReporter />);

    vi.advanceTimersByTime(3001);
    await vi.runAllTimersAsync();

    expect(adminService.reportWebVitals).toHaveBeenCalledTimes(1);

    // Re-render with a new pathname - the effect re-runs and creates a new LCP observer
    vi.mocked(usePathname).mockReturnValue('/cvs');
    rerender(<WebVitalsReporter />);

    // Two PerformanceObserver constructions confirm the effect ran twice
    expect(global.PerformanceObserver).toHaveBeenCalledTimes(2);
  });
});
