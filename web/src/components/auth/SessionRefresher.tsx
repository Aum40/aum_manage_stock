'use client';

import { useEffect } from 'react';

const REFRESH_INTERVAL_MS = 14 * 60 * 1000;
const REFRESH_MIN_GAP_MS = 10 * 60 * 1000;

/** ต่ออายุ session ล่วงหน้าก่อน access token อายุ 15 นาทีหมด */
export default function SessionRefresher() {
  useEffect(() => {
    let lastRefreshAt = 0;

    const refresh = async () => {
      const now = Date.now();
      if (now - lastRefreshAt < REFRESH_MIN_GAP_MS) return;

      lastRefreshAt = now;
      const response = await fetch('/api/auth/refresh', {
        method: 'POST',
        cache: 'no-store',
      }).catch(() => null);

      if (!response?.ok) {
        // ไม่ redirect จาก timer เอง ให้ request ถัดไป/หน้าปัจจุบันจัดการ auth error
        lastRefreshAt = 0;
      }
    };

    const interval = window.setInterval(refresh, REFRESH_INTERVAL_MS);
    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') void refresh();
    };

    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => {
      window.clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, []);

  return null;
}
