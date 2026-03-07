'use client';

import { useState, useCallback } from 'react';
import type { ToastMessage, ToastVariant } from '../components/ui/toast';

let toastIdCounter = 0;

function generateToastId(): string {
  toastIdCounter += 1;
  return `toast-${Date.now()}-${toastIdCounter}`;
}

interface ShowToastOptions {
  variant?: ToastVariant;
  duration?: number;
}

export function useToast() {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const showToast = useCallback((message: string, options: ShowToastOptions = {}) => {
    const newToast: ToastMessage = {
      id: generateToastId(),
      message,
      variant: options.variant ?? 'default',
      duration: options.duration ?? 4000,
    };

    setToasts((previousToasts) => [...previousToasts, newToast]);
  }, []);

  const dismissToast = useCallback((toastId: string) => {
    setToasts((previousToasts) => previousToasts.filter((toast) => toast.id !== toastId));
  }, []);

  const showSuccessToast = useCallback(
    (message: string, options?: Omit<ShowToastOptions, 'variant'>) => {
      showToast(message, { ...options, variant: 'success' });
    },
    [showToast]
  );

  const showErrorToast = useCallback(
    (message: string, options?: Omit<ShowToastOptions, 'variant'>) => {
      showToast(message, { ...options, variant: 'error' });
    },
    [showToast]
  );

  const showWarningToast = useCallback(
    (message: string, options?: Omit<ShowToastOptions, 'variant'>) => {
      showToast(message, { ...options, variant: 'warning' });
    },
    [showToast]
  );

  return {
    toasts,
    showToast,
    dismissToast,
    showSuccessToast,
    showErrorToast,
    showWarningToast,
  };
}
