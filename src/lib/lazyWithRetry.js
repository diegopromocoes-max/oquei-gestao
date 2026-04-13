import { lazy } from 'react';

function isChunkLoadError(error) {
  const message = String(error?.message || error || '');
  return (
    message.includes('Failed to fetch dynamically imported module')
    || message.includes('Importing a module script failed')
    || message.includes('Loading chunk')
    || message.includes('module script')
  );
}

export function lazyWithRetry(importFactory, retryKey = 'default') {
  return lazy(async () => {
    const storageKey = `oquei_lazy_retry_${retryKey}`;

    try {
      const module = await importFactory();
      if (typeof window !== 'undefined') {
        window.sessionStorage?.removeItem(storageKey);
      }
      return module;
    } catch (error) {
      if (typeof window !== 'undefined' && isChunkLoadError(error)) {
        const hasRetried = window.sessionStorage?.getItem(storageKey) === '1';
        if (!hasRetried) {
          window.sessionStorage?.setItem(storageKey, '1');
          window.location.reload();
          return new Promise(() => {});
        }
        window.sessionStorage?.removeItem(storageKey);
      }

      throw error;
    }
  });
}
