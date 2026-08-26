'use client';

import { useEffect, useState } from 'react';

/** หน่วงค่าที่พิมพ์ก่อนเอาไปเป็น query key ไม่งั้นยิง api ทุกตัวอักษร */
export function useDebounced<T>(value: T, delay = 350): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debounced;
}
