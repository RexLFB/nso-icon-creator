const SIZE = 256;

function emptyImageData(): ImageData {
  return new ImageData(SIZE, SIZE);
}

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Failed to load ${url}`));
    img.src = url;
  });
}

function toLayer(img: HTMLImageElement): ImageData {
  const canvas = document.createElement('canvas');
  canvas.width = SIZE;
  canvas.height = SIZE;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) throw new Error('No 2d context');
  ctx.clearRect(0, 0, SIZE, SIZE);
  ctx.drawImage(img, 0, 0, SIZE, SIZE);
  return ctx.getImageData(0, 0, SIZE, SIZE);
}

/** Drop baked-in drop shadows (dark, semi-transparent pixels). */
export function stripShadow(data: ImageData): ImageData {
  const d = data.data;
  for (let i = 0; i < d.length; i += 4) {
    const a = d[i + 3];
    if (a === 0) continue;
    const lum = 0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2];
    if (a < 240 && lum < 70) {
      d[i + 3] = 0;
    }
  }
  return data;
}

function isNearWhitePlate(r: number, g: number, b: number) {
  const chroma = Math.max(r, g, b) - Math.min(r, g, b);
  const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  return lum >= 228 && chroma <= 18;
}

/**
 * Default / Switch frames are opaque RGB PNGs whose interior is a solid
 * near-white fill (#f1f1f1) instead of alpha. Knock that plate out so the
 * character and background show through. Frames that already have a
 * transparent center (Mario, Splatoon, etc.) are left unchanged.
 */
function knockOutOpaquePlate(data: ImageData): ImageData {
  const d = data.data;
  const pixels = data.width * data.height;
  const mid = (Math.floor(data.height / 2) * data.width + Math.floor(data.width / 2)) * 4;
  const pr = d[mid];
  const pg = d[mid + 1];
  const pb = d[mid + 2];
  if (d[mid + 3] < 250 || !isNearWhitePlate(pr, pg, pb)) return data;

  const tol = 14;
  let hits = 0;
  for (let i = 0; i < d.length; i += 4) {
    if (
      d[i + 3] >= 250 &&
      Math.abs(d[i] - pr) <= tol &&
      Math.abs(d[i + 1] - pg) <= tol &&
      Math.abs(d[i + 2] - pb) <= tol
    ) {
      hits++;
    }
  }
  if (hits < pixels * 0.18) return data;

  for (let i = 0; i < d.length; i += 4) {
    if (
      d[i + 3] >= 250 &&
      Math.abs(d[i] - pr) <= tol &&
      Math.abs(d[i + 1] - pg) <= tol &&
      Math.abs(d[i + 2] - pb) <= tol
    ) {
      d[i + 3] = 0;
    }
  }
  return data;
}

function overPixel(
  sr: number, sg: number, sb: number, sa: number,
  dr: number, dg: number, db: number, da: number,
): [number, number, number, number] {
  const aS = sa / 255;
  const aD = da / 255;
  const outA = aS + aD * (1 - aS);
  if (outA <= 0) return [0, 0, 0, 0];
  const r = (sr * aS + dr * aD * (1 - aS)) / outA;
  const g = (sg * aS + dg * aD * (1 - aS)) / outA;
  const b = (sb * aS + db * aD * (1 - aS)) / outA;
  return [r, g, b, outA * 255];
}

function stackOver(src: ImageData, dst: ImageData): ImageData {
  const out = emptyImageData();
  const s = src.data;
  const d = dst.data;
  const o = out.data;
  for (let i = 0; i < o.length; i += 4) {
    const [r, g, b, a] = overPixel(s[i], s[i + 1], s[i + 2], s[i + 3], d[i], d[i + 1], d[i + 2], d[i + 3]);
    o[i] = r;
    o[i + 1] = g;
    o[i + 2] = b;
    o[i + 3] = a;
  }
  return out;
}

export type ComposeInput = {
  frameUrl?: string | null;
  characterUrl?: string | null;
  backgroundUrl?: string | null;
  hideShadow?: boolean;
};

async function layerFromUrl(url?: string | null): Promise<ImageData> {
  if (!url) return emptyImageData();
  try {
    return toLayer(await loadImage(url));
  } catch {
    return emptyImageData();
  }
}

export async function composeIcon(input: ComposeInput): Promise<HTMLCanvasElement> {
  let [frame, character, background] = await Promise.all([
    layerFromUrl(input.frameUrl),
    layerFromUrl(input.characterUrl),
    layerFromUrl(input.backgroundUrl),
  ]);
  if (input.hideShadow) character = stripShadow(character);
  frame = knockOutOpaquePlate(frame);

  let merged = stackOver(character, background);
  merged = stackOver(frame, merged);

  const canvas = document.createElement('canvas');
  canvas.width = SIZE;
  canvas.height = SIZE;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('No 2d context');
  ctx.putImageData(merged, 0, 0);
  return canvas;
}

/** PNG keeps transparency. JPG is painted over a white background. */
function renderBlob(source: HTMLCanvasElement, asPng: boolean): Promise<Blob | null> {
  if (asPng) {
    return new Promise((resolve) => source.toBlob((blob) => resolve(blob), 'image/png'));
  }
  const canvas = document.createElement('canvas');
  canvas.width = source.width;
  canvas.height = source.height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return Promise.resolve(null);
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(source, 0, 0);
  return new Promise((resolve) => canvas.toBlob((blob) => resolve(blob), 'image/jpeg', 0.95));
}

type SaveFilePicker = (options: {
  suggestedName?: string;
  types?: { description?: string; accept: Record<string, string[]> }[];
}) => Promise<{
  name: string;
  createWritable: () => Promise<{
    write: (data: Blob) => Promise<void>;
    close: () => Promise<void>;
  }>;
}>;

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  // Revoking in the same tick can cancel the download in some browsers.
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

export async function downloadIcon(input: ComposeInput, filename = 'nso-icon.jpg') {
  const source = await composeIcon(input);
  const baseName = filename.replace(/\.[^.]+$/, '');

  // Save dialog: JPG is the default type, PNG is the alternative.
  const picker = (window as unknown as { showSaveFilePicker?: SaveFilePicker }).showSaveFilePicker;
  if (picker) {
    try {
      const handle = await picker.call(window, {
        suggestedName: `${baseName}.jpg`,
        types: [
          { description: 'JPG (fondo blanco)', accept: { 'image/jpeg': ['.jpg', '.jpeg'] } },
          { description: 'PNG (transparente)', accept: { 'image/png': ['.png'] } },
        ],
      });
      const asPng = /\.png$/i.test(handle.name);
      const blob = await renderBlob(source, asPng);
      if (!blob) return;
      const writable = await handle.createWritable();
      await writable.write(blob);
      await writable.close();
      return;
    } catch (err) {
      // The user closed the dialog: do nothing.
      if (err instanceof DOMException && err.name === 'AbortError') return;
      // Any other problem: fall back to a plain JPG download below.
    }
  }

  const blob = await renderBlob(source, false);
  if (!blob) return;
  triggerDownload(blob, `${baseName}.jpg`);
}

export async function processedPartUrl(url: string, hideShadow: boolean): Promise<string> {
  const layer = await layerFromUrl(url);
  if (hideShadow) stripShadow(layer);
  const canvas = document.createElement('canvas');
  canvas.width = SIZE;
  canvas.height = SIZE;
  canvas.getContext('2d')!.putImageData(layer, 0, 0);
  return canvas.toDataURL('image/png');
}
