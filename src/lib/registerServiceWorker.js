/**
 * Register the service worker so Action opens offline and installs as an app.
 *
 * Skipped in development, where a cached shell makes hot reload confusing.
 */
export function registerServiceWorker() {
  if (import.meta.env.DEV || !('serviceWorker' in navigator)) return;

  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch((error) => {
      // Offline support is an enhancement; failing to register is not fatal.
      console.warn('Service worker registration failed:', error.message);
    });
  });
}
