import type { ReactNode } from 'react';

type Props = { children: ReactNode };

export function Stage({ children }: Props) {
  return (
    <div className="stage-viewport">
      <div className="stage">{children}</div>
    </div>
  );
}
