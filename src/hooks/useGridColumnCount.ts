import { useLayoutEffect, useState } from 'react';

function countColumns(el: HTMLElement) {
  const raw = getComputedStyle(el).gridTemplateColumns.trim();
  if (!raw || raw === 'none') return 1;
  return Math.max(1, raw.split(/\s+/).filter(Boolean).length);
}

export function useGridColumnCount(fallback = 1) {
  const [el, setEl] = useState<HTMLElement | null>(null);
  const [cols, setCols] = useState(fallback);

  useLayoutEffect(() => {
    if (!el) return;
    const read = () => setCols(countColumns(el));
    read();
    const ro = new ResizeObserver(read);
    ro.observe(el);
    return () => ro.disconnect();
  }, [el]);

  return [cols, setEl] as const;
}
