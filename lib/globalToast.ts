'use client';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export function fireToast(
  message: string,
  type: ToastType = 'info',
  options?: { duration?: number }
) {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(
    new CustomEvent('global-toast', {
      detail: { message, type, duration: options?.duration },
    })
  );
}
