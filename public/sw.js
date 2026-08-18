/**
 * Service worker.
 *
 * Deliberately conservative:
 *  - The app shell is cached so Action opens instantly and works offline.
 *  - API calls are NEVER cached. Serving a stale task list would be worse than
 *    showing an honest offline state, and writes must reach the server.
 *  - Navigations are network-first with a cached fallback, so a deploy is
 *    picked up on the next load rather than being pinned to an old build.
 */

const VERSION = 'v1';
const SHELL_CACHE = `action-shell-${VERSION}`;
const ASSET_CACHE = `action-assets-${VERSION}`;

const SHELL = ['/', '/index.html', '/manifest.webmanifest', '/logo.png', '/favicon.png'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(SHELL_CACHE)
      // One missing file must not fail the whole install.
      .then((cache) => Promise.allSettled(SHELL.map((url) => cache.add(url))))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key !== SHELL_CACHE && key !== ASSET_CACHE)
            .map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  // Never cache Supabase, auth or any AI traffic.
  if (
    url.hostname.includes('supabase') ||
    url.pathname.startsWith('/auth') ||
    url.pathname.startsWith('/rest') ||
    url.pathname.startsWith('/realtime')
  ) {
    return;
  }

  // Navigations: network first, fall back to the cached shell when offline.
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone();
          caches.open(SHELL_CACHE).then((cache) => cache.put('/index.html', copy));
          return response;
        })
        .catch(() => caches.match('/index.html').then((cached) => cached ?? Response.error())),
    );
    return;
  }

  // Hashed build assets are immutable, so cache-first is safe and fast.
  if (url.origin === self.location.origin && url.pathname.startsWith('/assets/')) {
    event.respondWith(
      caches.match(request).then(
        (cached) =>
          cached ??
          fetch(request).then((response) => {
            const copy = response.clone();
            caches.open(ASSET_CACHE).then((cache) => cache.put(request, copy));
            return response;
          }),
      ),
    );
  }
});
