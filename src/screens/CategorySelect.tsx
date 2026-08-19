import { useEffect } from 'react';
import { CategoryCard } from '../components/CategoryCard';
import { FooterBar } from '../components/FooterBar';
import { useGridColumnCount } from '../hooks/useGridColumnCount';
import { isConfirmKey, keyToDir, moveGridIndex } from '../lib/input';
import { useCreator } from '../store';

export function CategorySelect() {
  const catalog = useCreator((s) => s.catalog);
  const focus = useCreator((s) => s.focus);
  const setFocus = useCreator((s) => s.setFocus);
  const selectCategory = useCreator((s) => s.selectCategory);
  const categories = catalog?.categories ?? [];
  const [cols, gridRef] = useGridColumnCount(4);

  useEffect(() => {
    document
      .querySelector(`[data-cat-index="${focus}"]`)
      ?.scrollIntoView({ block: 'nearest' });
  }, [focus]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const list = useCreator.getState().catalog?.categories ?? [];
      const current = useCreator.getState().focus;
      const dir = keyToDir(e);
      if (dir) {
        e.preventDefault();
        setFocus(moveGridIndex(current, list.length, cols, dir));
        return;
      }
      if (isConfirmKey(e) && list[current]) {
        e.preventDefault();
        selectCategory(list[current].slug);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [cols, selectCategory, setFocus]);

  return (
    <div className="screen">
      <header className="header">
        <h1 className="header-title">Category Selection</h1>
        <div className="header-rule" />
        <p className="header-sub">Choose a category to base your icon on.</p>
      </header>
      <div className="screen-body">
        <div className="category-grid-wrap">
          <div ref={gridRef} className="category-grid">
            {categories.map((category, i) => (
              <CategoryCard
                key={category.slug}
                category={category}
                focused={i === focus}
                index={i}
                onHover={() => setFocus(i)}
                onConfirm={() => selectCategory(category.slug)}
              />
            ))}
          </div>
        </div>
      </div>
      <FooterBar
        prompts={[
          { key: 'B', label: 'Back' },
          {
            key: 'A',
            label: 'Confirm',
            onClick: () => categories[focus] && selectCategory(categories[focus].slug),
          },
        ]}
      />
    </div>
  );
}
