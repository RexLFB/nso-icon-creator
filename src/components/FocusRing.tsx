import type { CSSProperties, ReactNode } from 'react';

type Props = {
  active?: boolean;
  selected?: boolean;
  round?: boolean;
  inset?: boolean;
  overlap?: boolean;
  className?: string;
  style?: CSSProperties;
  children: ReactNode;
};

export function FocusRing({
  active,
  selected,
  round,
  inset,
  overlap,
  className = '',
  style,
  children,
}: Props) {
  const showInner = Boolean(inset && selected);
  return (
    <div
      className={`focus-host ${round ? 'is-round' : ''} ${overlap ? 'is-overlap' : ''} ${className}`.trim()}
      style={style}
    >
      {active ? <span className="focus-outline is-focus" /> : null}
      {showInner ? (
        <span className={`focus-inner ${active ? 'is-focus' : 'is-selected'}`} />
      ) : null}
      {children}
    </div>
  );
}
