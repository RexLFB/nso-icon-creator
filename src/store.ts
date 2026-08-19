import { create } from 'zustand';
import type { Catalog, Category, PartKind } from './lib/catalog';
import { getCategory, partCount } from './lib/catalog';
import { partUrl } from './lib/cdn';

export type Screen = 'category' | 'random' | 'editor' | 'picker';

export type Combo = {
  frame: string | null;
  character: string | null;
  background: string | null;
};

type CreatorState = {
  catalog: Catalog | null;
  error: string | null;
  screen: Screen;
  pickerKind: PartKind | null;
  categorySlug: string | null;
  frame: string | null;
  character: string | null;
  background: string | null;
  focus: number;
  randomCombos: Combo[];
  hideShadow: boolean;
  setCatalog: (catalog: Catalog) => void;
  setError: (error: string) => void;
  setFocus: (focus: number) => void;
  selectCategory: (slug: string) => void;
  openRandom: () => void;
  regenerateRandom: () => void;
  applyCombo: (combo: Combo) => void;
  createOwn: () => void;
  openEditor: () => void;
  openPicker: (kind: PartKind) => void;
  setPart: (kind: PartKind, file: string | null) => void;
  back: () => void;
  toggleHideShadow: () => void;
};

function pick<T>(list: T[]): T | null {
  if (!list.length) return null;
  return list[Math.floor(Math.random() * list.length)] ?? null;
}

function makeCombos(category: Category, count = 12): Combo[] {
  return Array.from({ length: count }, () => ({
    frame: pick(category.frames),
    character: pick(category.characters),
    background: pick(category.backgrounds),
  }));
}

export const useCreator = create<CreatorState>((set, get) => ({
  catalog: null,
  error: null,
  screen: 'category',
  pickerKind: null,
  categorySlug: null,
  frame: null,
  character: null,
  background: null,
  focus: 0,
  randomCombos: [],
  hideShadow: false,
  setCatalog: (catalog) => set({ catalog }),
  setError: (error) => set({ error }),
  setFocus: (focus) => set({ focus }),
  selectCategory: (slug) => {
    const { catalog } = get();
    if (!catalog) return;
    const category = getCategory(catalog, slug);
    if (!category) return;
    set({
      categorySlug: slug,
      frame: null,
      character: null,
      background: null,
      screen: 'random',
      randomCombos: makeCombos(category),
      focus: 0,
      pickerKind: null,
    });
  },
  openRandom: () => {
    const { catalog, categorySlug } = get();
    if (!catalog || !categorySlug) return;
    const category = getCategory(catalog, categorySlug);
    if (!category) return;
    set({
      screen: 'random',
      randomCombos: makeCombos(category),
      focus: 0,
      pickerKind: null,
    });
  },
  regenerateRandom: () => {
    const { catalog, categorySlug } = get();
    if (!catalog || !categorySlug) return;
    const category = getCategory(catalog, categorySlug);
    if (!category) return;
    set({ randomCombos: makeCombos(category), focus: 0 });
  },
  applyCombo: (combo) =>
    set({
      ...combo,
      screen: 'editor',
      focus: 4,
      pickerKind: null,
    }),
  createOwn: () =>
    set({
      frame: null,
      character: null,
      background: null,
      screen: 'editor',
      focus: 0,
      pickerKind: null,
    }),
  openEditor: () => set({ screen: 'editor', focus: 0, pickerKind: null }),
  openPicker: (kind) => {
    const { catalog, categorySlug, frame, character, background } = get();
    const category = catalog && categorySlug ? getCategory(catalog, categorySlug) : undefined;
    let focus = 0;
    if (category) {
      if (kind === 'frames') {
        const i = frame ? category.frames.indexOf(frame) : -1;
        focus = i >= 0 ? i + 1 : 0;
      } else if (kind === 'characters') {
        const i = character ? category.characters.indexOf(character) : -1;
        focus = i >= 0 ? i : 0;
      } else {
        const i = background ? category.backgrounds.indexOf(background) : -1;
        focus = i >= 0 ? i : 0;
      }
    }
    set({ screen: 'picker', pickerKind: kind, focus });
  },
  setPart: (kind, file) => {
    if (kind === 'frames') set({ frame: file, screen: 'editor', focus: 1, pickerKind: null });
    if (kind === 'characters') set({ character: file, screen: 'editor', focus: 2, pickerKind: null });
    if (kind === 'backgrounds') set({ background: file, screen: 'editor', focus: 3, pickerKind: null });
  },
  back: () => {
    const { screen } = get();
    if (screen === 'picker') set({ screen: 'editor', pickerKind: null, focus: 0 });
    else if (screen === 'editor') set({ screen: 'random', focus: 0 });
    else if (screen === 'random') set({ screen: 'category', focus: 0 });
  },
  toggleHideShadow: () => set((s) => ({ hideShadow: !s.hideShadow })),
}));

export function useActiveCategory(): Category | undefined {
  return useCreator((s) => {
    if (!s.catalog || !s.categorySlug) return undefined;
    return getCategory(s.catalog, s.categorySlug);
  });
}

export function comboUrls(slug: string, combo: Combo, hideShadow = false) {
  return {
    frameUrl: combo.frame ? partUrl(slug, 'frames', combo.frame) : null,
    characterUrl: combo.character ? partUrl(slug, 'characters', combo.character) : null,
    backgroundUrl: combo.background ? partUrl(slug, 'backgrounds', combo.background) : null,
    hideShadow,
  };
}

export function hasPreview(state: Pick<CreatorState, 'frame' | 'character' | 'background'>) {
  return state.frame !== null || state.character !== null || state.background !== null;
}

export function categoryFocusCount(catalog: Catalog | null) {
  return catalog?.categories.length ?? 0;
}

export { partCount };
