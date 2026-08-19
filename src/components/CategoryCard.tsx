import { useState } from 'react';
import type { Category } from '../lib/catalog';
import { partCount } from '../lib/catalog';
import { plateColor } from '../lib/names';
import { FocusRing } from './FocusRing';

type Props = {
  category: Category;
  focused: boolean;
  index: number;
  onHover: () => void;
  onConfirm: () => void;
};

const LOGO_BANNERS = new Set(['default', 'nintendo-switch-2']);

export function CategoryCard({ category, focused, index, onHover, onConfirm }: Props) {
  const count = partCount(category);
  const [bannerFailed, setBannerFailed] = useState(false);
  const showPhoto = Boolean(category.bannerUrl) && !bannerFailed;
  const logoBanner = LOGO_BANNERS.has(category.slug);

  return (
    <FocusRing active={focused} style={{ width: '100%', borderRadius: 12 }}>
      <button
        type="button"
        data-cat-index={index}
        className="category-card"
        onMouseEnter={onHover}
        onClick={onConfirm}
      >
        <div className={`category-card-art${logoBanner ? ' logo-banner' : ''}`}>
          {showPhoto ? (
            <img
              src={category.bannerUrl!}
              alt=""
              referrerPolicy="no-referrer"
              onError={() => setBannerFailed(true)}
            />
          ) : (
            <div className="category-card-plate" style={{ background: plateColor(category.slug) }}>
              <span>{category.name}</span>
            </div>
          )}
        </div>
        <div className="category-card-bar">{count}</div>
      </button>
    </FocusRing>
  );
}
