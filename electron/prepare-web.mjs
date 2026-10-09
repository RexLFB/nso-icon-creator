import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const catalogPath = join(root, 'public', 'catalog.json');
const LIVE_URL = 'https://harissabil.github.io/nso-icon-creator/catalog.json';

function run(cmd, env = {}) {
  console.log(`> ${cmd}`);
  const res = spawnSync(cmd, {
    cwd: root,
    stdio: 'inherit',
    shell: true,
    env: { ...process.env, ...env },
  });
  if (res.status !== 0) process.exit(res.status ?? 1);
}

async function downloadCatalog() {
  const res = await fetch(LIVE_URL);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  if (!Array.isArray(data.categories) || data.categories.length === 0) {
    throw new Error('catalog is empty');
  }
  mkdirSync(dirname(catalogPath), { recursive: true });
  writeFileSync(catalogPath, JSON.stringify(data));
  console.log(`catalog.json downloaded (${data.categories.length} categories)`);
}

async function ensureCatalog() {
  if (process.env.REBUILD_CATALOG === '1') {
    run('node scripts/build-catalog.mjs');
    return;
  }
  if (existsSync(catalogPath)) {
    console.log('public/catalog.json already present, keeping it');
    return;
  }
  try {
    await downloadCatalog();
  } catch (err) {
    console.warn(`Could not download the live catalog (${err.message}). Generating it instead...`);
    run('node scripts/build-catalog.mjs');
  }
}

await ensureCatalog();
run('npx tsc -b');
run('npx vite build', { BASE_PATH: './' });
console.log('Web build ready in dist/');
