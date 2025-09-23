// Runs as early as possible to invalidate cached state/tokens across releases.
// - Forces logout when BUILD_ID changes
// - Clears localStorage, sessionStorage
// - Attempts to clear Service Workers and Cache Storage

const BUILD_ID = (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_APP_BUILD_ID) ||
  // Fallback hardcoded build id; update this when you want to force re-login
  '2025-09-23-01';

const KEY = 'app_build_id';
const CLEARED_FLAG = 'app_build_cleared';

try {
  const prev = localStorage.getItem(KEY);
  if (prev && prev !== BUILD_ID && !sessionStorage.getItem(CLEARED_FLAG)) {
    // Mark so we don't loop
    sessionStorage.setItem(CLEARED_FLAG, '1');

    // Clear web storage
    try { localStorage.clear(); } catch {}
    try { sessionStorage.clear(); } catch {}

    // Clear Cache Storage (best-effort)
    if (typeof caches !== 'undefined' && caches?.keys) {
      caches.keys().then((names) => Promise.all(names.map((n) => caches.delete(n))).catch(() => {}));
    }

    // Unregister any service workers (best-effort)
    if (navigator?.serviceWorker?.getRegistrations) {
      navigator.serviceWorker.getRegistrations()
        .then((regs) => regs.forEach((r) => r.unregister()))
        .catch(() => {});
    }

    // Persist new build id after clearing
    try { localStorage.setItem(KEY, BUILD_ID); } catch {}

    // Redirect to login to force re-auth
    try {
      const base = '/login';
      if (window.location.pathname !== base) {
        window.location.replace(base);
      } else {
        window.location.reload();
      }
    } catch {}
  } else if (!prev) {
    // First run; set build id
    try { localStorage.setItem(KEY, BUILD_ID); } catch {}
  }
} catch {
  // Non-blocking
}

