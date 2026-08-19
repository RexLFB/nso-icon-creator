import { useEffect, useState } from 'react';
import { processedPartUrl } from '../lib/compose';

type Props = {
  url: string;
  hideShadow?: boolean;
  className?: string;
};

export function PartImage({ url, hideShadow = false, className = '' }: Props) {
  const [src, setSrc] = useState(url);

  useEffect(() => {
    let dead = false;
    if (!hideShadow) {
      setSrc(url);
      return;
    }
    processedPartUrl(url, true).then((next) => {
      if (!dead) setSrc(next);
    });
    return () => {
      dead = true;
    };
  }, [url, hideShadow]);

  return <img className={className} src={src} alt="" />;
}
