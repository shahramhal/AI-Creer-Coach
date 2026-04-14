import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useIsMobile } from './useIsMobile';

type MediaQueryCallback = (event: MediaQueryListEvent) => void;

function buildMatchMediaMock(initialMatches: boolean) {
  const listeners: MediaQueryCallback[] = [];

  const mediaQueryList = {
    matches: initialMatches,
    media: '',
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn((event: string, callback: MediaQueryCallback) => {
      if (event === 'change') listeners.push(callback);
    }),
    removeEventListener: vi.fn((event: string, callback: MediaQueryCallback) => {
      const index = listeners.indexOf(callback);
      if (index !== -1) listeners.splice(index, 1);
    }),
    dispatchEvent: vi.fn(),
    _triggerChange: (matches: boolean) => {
      mediaQueryList.matches = matches;
      const event = { matches } as MediaQueryListEvent;
      listeners.forEach((callback) => callback(event));
    },
  };

  return mediaQueryList;
}

describe('useIsMobile', () => {
  let matchMediaMock: ReturnType<typeof buildMatchMediaMock>;

  beforeEach(() => {
    matchMediaMock = buildMatchMediaMock(false);
    vi.stubGlobal('matchMedia', vi.fn(() => matchMediaMock));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('should return false when the viewport is wider than 767px', () => {
    matchMediaMock = buildMatchMediaMock(false);
    vi.stubGlobal('matchMedia', vi.fn(() => matchMediaMock));

    const { result } = renderHook(() => useIsMobile());

    expect(result.current).toBe(false);
  });

  it('should return true when the viewport is narrower than 768px', () => {
    matchMediaMock = buildMatchMediaMock(true);
    vi.stubGlobal('matchMedia', vi.fn(() => matchMediaMock));

    const { result } = renderHook(() => useIsMobile());

    expect(result.current).toBe(true);
  });

  it('should update to true when the viewport shrinks below the mobile breakpoint', () => {
    matchMediaMock = buildMatchMediaMock(false);
    vi.stubGlobal('matchMedia', vi.fn(() => matchMediaMock));

    const { result } = renderHook(() => useIsMobile());
    expect(result.current).toBe(false);

    act(() => {
      matchMediaMock._triggerChange(true);
    });

    expect(result.current).toBe(true);
  });

  it('should update to false when the viewport grows above the mobile breakpoint', () => {
    matchMediaMock = buildMatchMediaMock(true);
    vi.stubGlobal('matchMedia', vi.fn(() => matchMediaMock));

    const { result } = renderHook(() => useIsMobile());
    expect(result.current).toBe(true);

    act(() => {
      matchMediaMock._triggerChange(false);
    });

    expect(result.current).toBe(false);
  });

  it('should register a change listener on mount', () => {
    renderHook(() => useIsMobile());

    expect(matchMediaMock.addEventListener).toHaveBeenCalledWith('change', expect.any(Function));
  });

  it('should remove the change listener on unmount', () => {
    const { unmount } = renderHook(() => useIsMobile());
    unmount();

    expect(matchMediaMock.removeEventListener).toHaveBeenCalledWith('change', expect.any(Function));
  });

  it('should query matchMedia with the correct breakpoint expression', () => {
    renderHook(() => useIsMobile());

    expect(window.matchMedia).toHaveBeenCalledWith('(max-width: 767px)');
  });
});
