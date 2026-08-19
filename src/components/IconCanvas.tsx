import { useEffect, useState } from 'react';
import { composeIcon, type ComposeInput } from '../lib/compose';

type Props = {
  input: ComposeInput;
  size?: number;
  fill?: boolean;
  circular?: boolean;
  className?: string;
};

export function IconCanvas({ input, size = 256, fill = false, circular = true, className = '' }: Props) {
  const [src, setSrc] = useState<string | null>(
    input.characterUrl || input.frameUrl || input.backgroundUrl || null,
  );
  const { frameUrl, characterUrl, backgroundUrl, hideShadow } = input;
  const placeholder = characterUrl || frameUrl || backgroundUrl || null;

  useEffect(() => {
    let dead = false;
    setSrc(placeholder);
    composeIcon({ frameUrl, characterUrl, backgroundUrl, hideShadow })
      .then((canvas) => {
        if (dead) return;
        setSrc(canvas.toDataURL('image/png'));
      })
      .catch(() => {
        if (!dead) setSrc(placeholder);
      });
    return () => {
      dead = true;
    };
  }, [frameUrl, characterUrl, backgroundUrl, hideShadow, placeholder]);

  return (
    <img
      className={`icon-canvas ${circular ? 'is-round' : ''} ${className}`.trim()}
      src={src ?? 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw=='}
      alt=""
      width={size}
      height={size}
      style={{
        width: fill ? '100%' : size,
        height: fill ? '100%' : size,
        borderRadius: circular ? '50%' : 6,
        background: 'transparent',
        objectFit: 'contain',
        opacity: src ? 1 : 0,
      }}
    />
  );
}
