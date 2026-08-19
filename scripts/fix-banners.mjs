import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { BANNER_OVERRIDES, NO_STORE, pickBanner, searchName } from './banners.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const catalogPath = join(root, 'public', 'catalog.json');

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

function withTimeout(promise, ms) {
  return Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), ms)),
  ]);
}

async function eshopHits(query) {
  const ms = process.env.VERCEL || process.env.CI ? 4000 : 10000;
  try {
    const { getQueriedGamesAmerica } = await import('nintendo-switch-eshop');
    return await withTimeout(getQueriedGamesAmerica(query, { hitsPerPage: 12, page: 0 }), ms);
  } catch {
    return [];
  }
}

async function rawgHits(query) {
  const key = process.env.RAWG_API_KEY;
  if (!key) return [];
  try {
    const url = `https://api.rawg.io/api/games?key=${encodeURIComponent(key)}&search=${encodeURIComponent(query)}&page_size=5`;
    const res = await fetch(url);
    if (!res.ok) return [];
    const json = await res.json();
    return (json.results ?? []).map((g) => ({
      title: g.name,
      background_image: g.background_image,
    }));
  } catch {
    return [];
  }
}

export async function resolveBanner(slug) {
  if (BANNER_OVERRIDES[slug]) return { url: BANNER_OVERRIDES[slug], source: 'override' };
  if (NO_STORE.has(slug)) return { url: null, source: 'plate' };
  const query = searchName(slug);
  const picked = pickBanner(query, await eshopHits(query), slug);
  if (picked) return { url: picked.url, source: 'eshop' };
  await sleep(80);
  const rawg = pickBanner(query, await rawgHits(query), slug);
  if (rawg) return { url: rawg.url, source: 'rawg' };
  return { url: null, source: 'plate' };
}

loadEnv();

if (process.argv[1] && process.argv[1].includes('fix-banners')) {
  const catalog = JSON.parse(readFileSync(catalogPath, 'utf8'));
  console.log(`RAWG ${process.env.RAWG_API_KEY ? 'on' : 'off (missing RAWG_API_KEY in .env)'}`);
  console.log(`Refreshing banners for ${catalog.categories.length} categories…`);
  for (const [i, category] of catalog.categories.entries()) {
    process.stdout.write(`[${i + 1}/${catalog.categories.length}] ${category.slug} `);
    const next = await resolveBanner(category.slug);
    category.bannerUrl = next.url;
    console.log(next.source);
    await sleep(90);
  }
  writeFileSync(catalogPath, JSON.stringify(catalog, null, 2));
  console.log(`Wrote ${catalogPath}`);
}
