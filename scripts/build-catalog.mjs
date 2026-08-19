import { mkdirSync, writeFileSync, existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { resolveBanner } from './fix-banners.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const outPath = join(root, 'public', 'catalog.json');
const SKIP_SLUGS = new Set(['outdated-parts']);
const TREE_URL = 'https://api.github.com/repos/henry-debruin/nso-icons/git/trees/main?recursive=1';

function loadEnv() {
  const envPath = join(root, '.env');
  if (!existsSync(envPath)) return;
  const text = readFileSync(envPath, 'utf8').replace(/^\uFEFF/, '');
  for (const line of text.split(/\r?\n/)) {
    const m = line.match(/^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
    if (!m) continue;
    process.env[m[1]] = m[2].replace(/^['"]|['"]$/g, '').trim();
  }
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function titleCase(slug) {
  return slug
    .split('-')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

async function fetchTree() {
  const headers = {
    'User-Agent': 'nso-icon-creator',
    Accept: 'application/vnd.github+json',
  };
  const token = process.env.GITHUB_TOKEN || process.env.GH_TOKEN;
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(TREE_URL, { headers });
  if (!res.ok) throw new Error(`GitHub tree ${res.status}`);
  return res.json();
}

async function mapPool(items, limit, fn) {
  const out = new Array(items.length);
  let next = 0;
  async function worker() {
    while (next < items.length) {
      const i = next++;
      out[i] = await fn(items[i], i);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return out;
}

async function bannerFor(slug) {
  try {
    return await resolveBanner(slug);
  } catch {
    return { url: null, source: 'plate' };
  }
}

loadEnv();

const tree = await fetchTree();
if (tree.truncated) console.warn('GitHub tree was truncated; catalog may be incomplete.');

/** @type {Map<string, { frames: string[], characters: string[], backgrounds: string[] }>} */
const buckets = new Map();

for (const item of tree.tree ?? []) {
  if (item.type !== 'blob' || !item.path?.endsWith('.png')) continue;
  const parts = item.path.split('/');
  if (parts.length !== 3) continue;
  const [slug, kind, file] = parts;
  if (SKIP_SLUGS.has(slug) || kind === 'mii') continue;
  if (!['frames', 'characters', 'backgrounds'].includes(kind)) continue;
  if (!buckets.has(slug)) buckets.set(slug, { frames: [], characters: [], backgrounds: [] });
  buckets.get(slug)[kind].push(file);
}

const slugs = [...buckets.keys()].sort();
const ci = Boolean(process.env.VERCEL || process.env.CI);
console.log(`Found ${slugs.length} categories. Resolving banners…`);
console.log(`RAWG ${process.env.RAWG_API_KEY ? 'on' : 'off (missing RAWG_API_KEY)'}`);

const categories = await mapPool(slugs, ci ? 5 : 1, async (slug, i) => {
  const parts = buckets.get(slug);
  for (const kind of ['frames', 'characters', 'backgrounds']) {
    parts[kind].sort();
  }
  const banner = await bannerFor(slug);
  console.log(`[${i + 1}/${slugs.length}] ${slug} ${banner.source}`);
  if (!ci) await sleep(80);
  return {
    slug,
    name: titleCase(slug),
    bannerUrl: banner.url,
    ...parts,
  };
});

mkdirSync(join(root, 'public'), { recursive: true });
const catalog = {
  source: 'https://github.com/henry-debruin/nso-icons',
  generatedAt: new Date().toISOString(),
  categories,
};
writeFileSync(outPath, JSON.stringify(catalog, null, 2));
console.log(`Wrote ${outPath}`);
