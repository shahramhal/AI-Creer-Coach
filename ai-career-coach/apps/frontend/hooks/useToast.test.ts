import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useToast } from './useToast';

describe('useToast', () => {
  it('should start with an empty toast list', () => {
    const { result } = renderHook(() => useToast());

    expect(result.current.toasts).toHaveLength(0);
  });

  it('should add a toast when showToast is called', () => {
    const { result } = renderHook(() => useToast());

    act(() => {
      result.current.showToast('Hello world');
    });

    expect(result.current.toasts).toHaveLength(1);
    expect(result.current.toasts[0].message).toBe('Hello world');
  });

  it('should default the variant to "default" when no options are provided', () => {
    const { result } = renderHook(() => useToast());

    act(() => {
      result.current.showToast('Test message');
    });

    expect(result.current.toasts[0].variant).toBe('default');
  });

  it('should use the supplied variant when options include one', () => {
    const { result } = renderHook(() => useToast());

    act(() => {
      result.current.showToast('Error!', { variant: 'error' });
    });

    expect(result.current.toasts[0].variant).toBe('error');
  });

  it('should default the duration to 4000ms when no duration option is provided', () => {
    const { result } = renderHook(() => useToast());

    act(() => {
      result.current.showToast('Timer toast');
    });

    expect(result.current.toasts[0].duration).toBe(4000);
  });

  it('should use a custom duration when supplied via options', () => {
    const { result } = renderHook(() => useToast());

    act(() => {
      result.current.showToast('Custom duration', { duration: 8000 });
    });

    expect(result.current.toasts[0].duration).toBe(8000);
  });

  it('should remove the correct toast when dismissToast is called', () => {
    const { result } = renderHook(() => useToast());

    act(() => {
      result.current.showToast('First');
      result.current.showToast('Second');
    });

    const firstToastId = result.current.toasts[0].id;

    act(() => {
      result.current.dismissToast(firstToastId);
    });

    expect(result.current.toasts).toHaveLength(1);
    expect(result.current.toasts[0].message).toBe('Second');
  });

  it('should not affect other toasts when a non-existent id is dismissed', () => {
    const { result } = renderHook(() => useToast());

    act(() => {
      result.current.showToast('Keep me');
    });

    act(() => {
      result.current.dismissToast('ghost-id-99');
    });

    expect(result.current.toasts).toHaveLength(1);
  });

  it('should add a success toast with variant "success" via showSuccessToast', () => {
    const { result } = renderHook(() => useToast());

    act(() => {
      result.current.showSuccessToast('Saved successfully');
    });

    expect(result.current.toasts[0].message).toBe('Saved successfully');
    expect(result.current.toasts[0].variant).toBe('success');
  });

  it('should add an error toast with variant "error" via showErrorToast', () => {
    const { result } = renderHook(() => useToast());

    act(() => {
      result.current.showErrorToast('Something failed');
    });

    expect(result.current.toasts[0].message).toBe('Something failed');
    expect(result.current.toasts[0].variant).toBe('error');
  });

  it('should add a warning toast with variant "warning" via showWarningToast', () => {
    const { result } = renderHook(() => useToast());

    act(() => {
      result.current.showWarningToast('Heads up');
    });

    expect(result.current.toasts[0].message).toBe('Heads up');
    expect(result.current.toasts[0].variant).toBe('warning');
  });

  it('should accumulate multiple toasts in order', () => {
    const { result } = renderHook(() => useToast());

    act(() => {
      result.current.showToast('First');
      result.current.showToast('Second');
      result.current.showToast('Third');
    });

    expect(result.current.toasts).toHaveLength(3);
    expect(result.current.toasts[0].message).toBe('First');
    expect(result.current.toasts[2].message).toBe('Third');
  });

  it('should give each toast a unique id', () => {
    const { result } = renderHook(() => useToast());

    act(() => {
      result.current.showToast('A');
      result.current.showToast('B');
    });

    const ids = result.current.toasts.map((toast) => toast.id);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(2);
  });
});
