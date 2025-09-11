import { useEffect, useRef } from "react";

const IDLE_LIMIT_MS = 12 * 60 * 60 * 1000; // 12 hours
const STORAGE_KEY = "lastActivityAt";

const IdleLogout = () => {
  const timerRef = useRef(null);

  useEffect(() => {
    const now = Date.now();
    if (!localStorage.getItem(STORAGE_KEY)) {
      localStorage.setItem(STORAGE_KEY, String(now));
    }

    const markActivity = () => {
      localStorage.setItem(STORAGE_KEY, String(Date.now()));
    };

    const logout = () => {
      // Clear auth token and redirect to login
      localStorage.removeItem("token");
      // Small guard to avoid loops
      if (window.location.pathname !== "/login") {
        window.location.href = "/login";
      }
    };

    const checkIdle = () => {
      const last = Number(localStorage.getItem(STORAGE_KEY) || 0);
      if (!Number.isFinite(last)) return;
      const idle = Date.now() - last;
      if (idle >= IDLE_LIMIT_MS) {
        logout();
      }
    };

    // Event listeners to record activity
    const events = [
      "mousemove",
      "keydown",
      "click",
      "scroll",
      "touchstart",
      "visibilitychange",
    ];
    events.forEach((e) => window.addEventListener(e, markActivity, { passive: true }));

    // Check periodically (every minute)
    timerRef.current = window.setInterval(checkIdle, 60 * 1000);

    // Also check on tab focus return immediately
    window.addEventListener("focus", checkIdle);

    // Sync across tabs
    const onStorage = (e) => {
      if (e.key === STORAGE_KEY) {
        // Another tab marked activity; nothing else to do
      }
    };
    window.addEventListener("storage", onStorage);

    // Initial check in case tab was left open
    checkIdle();

    return () => {
      events.forEach((e) => window.removeEventListener(e, markActivity));
      window.removeEventListener("focus", checkIdle);
      window.removeEventListener("storage", onStorage);
      if (timerRef.current) window.clearInterval(timerRef.current);
    };
  }, []);

  return null;
};

export default IdleLogout;

