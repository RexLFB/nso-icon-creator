import { useEffect } from 'react';
import { FooterBar } from '../components/FooterBar';
import { FocusRing } from '../components/FocusRing';
import { IconCanvas } from '../components/IconCanvas';
import { PartImage } from '../components/PartImage';
import { useGridColumnCount } from '../hooks/useGridColumnCount';
import { partUrl } from '../lib/cdn';
import { isBackKey, isConfirmKey, isYKey, keyToDir, moveGridIndex } from '../lib/input';
import { comboUrls, useActiveCategory, useCreator } from '../store';

const NONE = '__none__';

export function PartPicker() {
  const kind = useCreator((s) => s.pickerKind);
  const focus = useCreator((s) => s.focus);
  const setFocus = useCreator((s) => s.setFocus);
  const setPart = useCreator((s) => s.setPart);
  const back = useCreator((s) => s.back);
  const frame = useCreator((s) => s.frame);
  const character = useCreator((s) => s.character);
  const background = useCreator((s) => s.background);
  const hideShadow = useCreator((s) => s.hideShadow);
  const toggleHideShadow = useCreator((s) => s.toggleHideShadow);
  const category = useActiveCategory();
  const [cols, gridRef] = useGridColumnCount(5);

  const files =
    kind && category
      ? kind === 'frames'
        ? [NONE, ...category[kind]]
        : [...category[kind]]
      : [NONE];
  const applied =
    kind === 'frames' ? frame : kind === 'characters' ? character : background;

  const confirm = () => {
    if (!kind) return;
    const file = files[focus];
    setPart(kind, file === NONE ? null : file ?? null);
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (isBackKey(e)) {
        e.preventDefault();
        back();
        return;
      }
      if (kind === 'characters' && isYKey(e)) {
        e.preventDefault();
        toggleHideShadow();
        return;
      }
      const dir = keyToDir(e);
      if (dir) {
        e.preventDefault();
        setFocus(moveGridIndex(focus, files.length, cols, dir));
        return;
      }
      if (isConfirmKey(e)) {
        e.preventDefault();
        confirm();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  useEffect(() => {
    document
      .querySelector(`[data-part-index="${focus}"]`)
      ?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  }, [focus]);

  if (!category || !kind) return null;

  const title = {
    frames: `Frames (${category.frames.length})`,
    characters: `Characters (${category.characters.length})`,
    backgrounds: `Backgrounds (${category.backgrounds.length})`,
  }[kind];

  const previewCombo = {
    frame: kind === 'frames' ? (files[focus] === NONE ? null : files[focus] ?? null) : frame,
    character:
      kind === 'characters' ? (files[focus] === NONE ? null : files[focus] ?? null) : character,
    background:
      kind === 'backgrounds' ? (files[focus] === NONE ? null : files[focus] ?? null) : background,
  };

  const frameOnly = kind === 'frames';
  const stripShadows = kind === 'characters' && hideShadow;

  return (
    <div className="screen">
      <header className="header">
        <div className="header-row">
          <h1 className="header-title">{title}</h1>
          <p className="header-side">{category.name}</p>
        </div>
        <div className="header-rule" />
      </header>
      <div className="split is-picker">
        <div className="split-left">
          <div ref={gridRef} className="picker-grid">
            {files.map((file, i) => {
              const isNone = file === NONE;
              const isApplied = (applied ?? null) === (isNone ? null : file);
              return (
                <FocusRing
                  key={file}
                  active={i === focus}
                  selected={isApplied}
                  inset
                  style={{ borderRadius: 0 }}
                >
                  <button
                    type="button"
                    data-part-index={i}
                    className="part-tile"
                    onMouseEnter={() => setFocus(i)}
                    onClick={() => {
                      setFocus(i);
                      setPart(kind, isNone ? null : file);
                    }}
                  >
                    {isNone ? (
                      <div className="none-mark">
                        <span />
                      </div>
                    ) : kind === 'characters' ? (
                      <PartImage
                        url={partUrl(category.slug, kind, file)}
                        hideShadow={stripShadows}
                      />
                    ) : (
                      <img src={partUrl(category.slug, kind, file)} alt="" />
                    )}
                  </button>
                </FocusRing>
              );
            })}
          </div>
        </div>
        <div className="split-right">
          <div className="preview-frame">
            <IconCanvas
              fill
              input={
                frameOnly
                  ? comboUrls(
                      category.slug,
                      { frame: previewCombo.frame, character: null, background: null },
                      hideShadow,
                    )
                  : comboUrls(category.slug, previewCombo, hideShadow)
              }
              size={300}
            />
          </div>
        </div>
      </div>
      <FooterBar
        prompts={[
          ...(kind === 'characters'
            ? [
                {
                  key: 'Y',
                  label: hideShadow ? 'Show Shadow' : 'Hide Shadow',
                  onClick: toggleHideShadow,
                },
              ]
            : []),
          { key: 'B', label: 'Back', onClick: back },
          { key: 'A', label: 'Confirm', onClick: confirm },
        ]}
      />
    </div>
  );
}
