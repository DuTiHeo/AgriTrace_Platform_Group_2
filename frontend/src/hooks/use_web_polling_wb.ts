import { useEffect } from "react";

export const WEB_REFRESH_INTERVAL = 30_000;

export function useWebPolling(load: (background: boolean) => Promise<void>, enabled = true) {
  useEffect(() => {
    if (!enabled) return;

    let pending = false;
    const timer = window.setInterval(async () => {
      if (document.hidden || pending) return;
      pending = true;
      try {
        await load(true);
      } finally {
        pending = false;
      }
    }, WEB_REFRESH_INTERVAL);

    return () => window.clearInterval(timer);
  }, [enabled, load]);
}
