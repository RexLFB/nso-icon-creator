export type NavDir = 'up' | 'down' | 'left' | 'right';

export function moveGridIndex(
  current: number,
  total: number,
  cols: number,
  dir: NavDir,
): number {
  if (total <= 0) return 0;
  const rows = Math.ceil(total / cols);
  const row = Math.floor(current / cols);
  const col = current % cols;

  if (dir === 'left') return (current - 1 + total) % total;
  if (dir === 'right') return (current + 1) % total;
  if (dir === 'up') {
    const nextRow = (row - 1 + rows) % rows;
    const next = nextRow * cols + col;
    return next < total ? next : Math.min(current, total - 1);
  }
  const nextRow = (row + 1) % rows;
  const next = nextRow * cols + col;
  return next < total ? next : col < total ? col : total - 1;
}

export function keyToDir(e: KeyboardEvent): NavDir | null {
  const k = e.key.toLowerCase();
  if (k === 'arrowleft' || k === 'a') return 'left';
  if (k === 'arrowright' || k === 'd') return 'right';
  if (k === 'arrowup' || k === 'w') return 'up';
  if (k === 'arrowdown' || k === 's') return 'down';
  return null;
}

export function isConfirmKey(e: KeyboardEvent) {
  return e.key === 'Enter' || e.key === ' ';
}

export function isBackKey(e: KeyboardEvent) {
  return e.key === 'Escape' || e.key === 'Backspace';
}

export function isYKey(e: KeyboardEvent) {
  return e.key.toLowerCase() === 'y';
}
