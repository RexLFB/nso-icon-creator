import { useEffect } from 'react';
import { FooterBar } from '../components/FooterBar';
import { FocusRing } from '../components/FocusRing';
import { IconCanvas } from '../components/IconCanvas';
import { downloadIcon } from '../lib/compose';
import { partUrl } from '../lib/cdn';
import { isBackKey, isConfirmKey, keyToDir } from '../lib/input';
import { comboUrls, hasPreview, useActiveCategory, useCreator } from '../store';

export function IconEditor() {
  const focus = useCreator((s) => s.focus);
  const setFocus = useCreator((s) => s.setFocus);
  const frame = useCreator((s) => s.frame);
  const character = useCreator((s) => s.character);
  const background = useCreator((s) => s.background);
  const hideShadow = useCreator((s) => s.hideShadow);
  const openPicker = useCreator((s) => s.openPicker);
  const back = useCreator((s) => s.back);
  const category = useActiveCategory();
  const showPreview = hasPreview({ frame, character, background });

  const confirmAt = async (index: number) => {
    if (!category) return;
    if (index === 0) {
      useCreator.setState({ screen: 'category', focus: 0 });
      return;
    }
    if (index === 1) openPicker('frames');
    if (index === 2) openPicker('characters');
    if (index === 3) openPicker('backgrounds');
    if (index === 4) {
      await downloadIcon(
        comboUrls(category.slug, { frame, character, background }, hideShadow),
        `${category.slug}-icon.png`,
      );
    }
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (isBackKey(e)) {
        e.preventDefault();
        back();
        return;
      }
      const dir = keyToDir(e);
      if (dir === 'up' || dir === 'left') {
        e.preventDefault();
        setFocus((focus + 4) % 5);
        return;
      }
      if (dir === 'down' || dir === 'right') {
        e.preventDefault();
        setFocus((focus + 1) % 5);
        return;
      }
      if (isConfirmKey(e)) {
        e.preventDefault();
        void confirmAt(focus);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  if (!category) return null;

  const rows = [
    {
      label: 'Category',
      right: <span className="menu-value">{category.name}</span>,
    },
    {
      label: `Frames (${category.frames.length})`,
      right: frame ? (
        <img className="menu-thumb" src={partUrl(category.slug, 'frames', frame)} alt="" />
      ) : null,
    },
    {
      label: `Characters (${category.characters.length})`,
      right: character ? (
        <img className="menu-thumb" src={partUrl(category.slug, 'characters', character)} alt="" />
      ) : null,
    },
    {
      label: `Backgrounds (${category.backgrounds.length})`,
      right: background ? (
        <img
          className="menu-thumb"
          src={partUrl(category.slug, 'backgrounds', background)}
          alt=""
        />
      ) : null,
    },
  ];

  return (
    <div className="screen">
      <header className="header">
        <h1 className="header-title">Icon Creation</h1>
        <div className="header-rule" />
      </header>
      <div className="split is-editor">
        <div className="split-left">
          <p className="hint">Select an icon element.</p>
          <div className="menu-list">
            {rows.map((row, i) => (
              <div key={row.label} className="menu-row-inner">
                <FocusRing active={focus === i} style={{ width: '100%', borderRadius: 8 }}>
                  <button
                    type="button"
                    className="menu-row"
                    onMouseEnter={() => setFocus(i)}
                    onClick={() => {
                      setFocus(i);
                      void confirmAt(i);
                    }}
                  >
                    <span>{row.label}</span>
                    {row.right}
                  </button>
                </FocusRing>
              </div>
            ))}
          </div>
          <div className="ok-wrap">
            <FocusRing overlap active={focus === 4} style={{ borderRadius: 4 }}>
              <button
                type="button"
                className="ok-btn"
                onMouseEnter={() => setFocus(4)}
                onClick={() => {
                  setFocus(4);
                  void confirmAt(4);
                }}
              >
                OK
              </button>
            </FocusRing>
          </div>
        </div>
        <div className="split-right">
          {showPreview ? (
            <div className="preview-frame">
              <IconCanvas
                fill
                input={comboUrls(category.slug, { frame, character, background }, hideShadow)}
                size={300}
              />
            </div>
          ) : null}
        </div>
      </div>
      <FooterBar
        prompts={[
          { key: 'B', label: 'Back', onClick: back },
          { key: 'A', label: 'Confirm', onClick: () => void confirmAt(focus) },
        ]}
      />
    </div>
  );
}
