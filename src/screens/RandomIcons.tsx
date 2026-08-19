import { useEffect } from 'react';
import { FooterBar } from '../components/FooterBar';
import { FocusRing } from '../components/FocusRing';
import { IconCanvas } from '../components/IconCanvas';
import { useGridColumnCount } from '../hooks/useGridColumnCount';
import { isBackKey, isConfirmKey, isYKey, keyToDir, moveGridIndex } from '../lib/input';
import { comboUrls, useActiveCategory, useCreator } from '../store';

export function RandomIcons() {
  const focus = useCreator((s) => s.focus);
  const setFocus = useCreator((s) => s.setFocus);
  const combos = useCreator((s) => s.randomCombos);
  const applyCombo = useCreator((s) => s.applyCombo);
  const createOwn = useCreator((s) => s.createOwn);
  const back = useCreator((s) => s.back);
  const regenerateRandom = useCreator((s) => s.regenerateRandom);
  const category = useActiveCategory();
  const [cols, gridRef] = useGridColumnCount(6);
  const createIndex = combos.length;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (isBackKey(e)) {
        e.preventDefault();
        back();
        return;
      }
      if (isYKey(e)) {
        e.preventDefault();
        regenerateRandom();
        return;
      }
      const dir = keyToDir(e);
      if (dir) {
        e.preventDefault();
        const current = useCreator.getState().focus;
        const total = combos.length;
        if (total === 0) {
          setFocus(createIndex);
          return;
        }
        if (current === createIndex) {
          if (dir === 'up') {
            const lastRow = Math.ceil(total / cols) - 1;
            const col = Math.min(cols - 1, (total - 1) % cols);
            setFocus(Math.min(total - 1, lastRow * cols + col));
          } else if (dir === 'left') {
            setFocus(total - 1);
          } else {
            setFocus(0);
          }
          return;
        }
        if (dir === 'down') {
          const row = Math.floor(current / cols);
          const lastRow = Math.ceil(total / cols) - 1;
          if (row === lastRow) {
            setFocus(createIndex);
            return;
          }
        }
        setFocus(moveGridIndex(current, total, cols, dir));
        return;
      }
      if (isConfirmKey(e)) {
        e.preventDefault();
        if (focus >= combos.length) createOwn();
        else if (combos[focus]) applyCombo(combos[focus]);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [applyCombo, back, cols, combos, createIndex, createOwn, focus, regenerateRandom, setFocus]);

  if (!category) return null;

  return (
    <div className="screen">
      <header className="header">
        <div className="header-row">
          <h1 className="header-title">Icon Creation</h1>
          <p className="header-side">{category.name}</p>
        </div>
        <div className="header-rule" />
        <p className="header-sub">
          These icons were created using random elements. You can make your own by selecting the
          elements yourself.
        </p>
      </header>
      <div className="screen-body random-body">
        <div ref={gridRef} className="random-grid">
          {combos.map((combo, i) => (
            <button
              key={i}
              type="button"
              className="random-slot"
              onMouseEnter={() => setFocus(i)}
              onClick={() => applyCombo(combo)}
            >
              <FocusRing active={i === focus} round>
                <IconCanvas fill input={comboUrls(category.slug, combo)} size={256} />
              </FocusRing>
            </button>
          ))}
        </div>
        <div className="create-btn-wrap">
          <FocusRing overlap active={focus === createIndex} style={{ borderRadius: 4 }}>
            <button
              type="button"
              className="create-btn"
              onMouseEnter={() => setFocus(createIndex)}
              onClick={createOwn}
            >
              Create Your Icon
            </button>
          </FocusRing>
        </div>
      </div>
      <FooterBar
        prompts={[
          { key: 'Y', label: 'See More', onClick: regenerateRandom },
          { key: 'B', label: 'Back', onClick: back },
          {
            key: 'A',
            label: 'Confirm',
            onClick: () =>
              focus >= combos.length ? createOwn() : combos[focus] && applyCombo(combos[focus]),
          },
        ]}
      />
    </div>
  );
}
