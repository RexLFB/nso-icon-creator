const { app, BrowserWindow, protocol, net, shell, Menu, session } = require('electron');
const path = require('node:path');
const fs = require('node:fs');
const crypto = require('node:crypto');
const { pathToFileURL } = require('node:url');

const DIST = path.join(__dirname, '..', 'dist');

protocol.registerSchemesAsPrivileged([
  {
    scheme: 'app',
    privileges: { standard: true, secure: true, supportFetchAPI: true, corsEnabled: true },
  },
]);

// ---------------------------------------------------------------------------
// Caché de imágenes en disco: lo que se carga una vez queda guardado y se
// puede volver a ver sin internet.
// ---------------------------------------------------------------------------
let cacheDir = null;

function cacheKey(url) {
  return crypto.createHash('sha256').update(url).digest('hex');
}

async function readCached(url) {
  try {
    const key = cacheKey(url);
    const meta = JSON.parse(await fs.promises.readFile(path.join(cacheDir, `${key}.json`), 'utf8'));
    const data = await fs.promises.readFile(path.join(cacheDir, `${key}.bin`));
    return { data, contentType: meta.contentType };
  } catch {
    return null;
  }
}

async function writeCached(url, data, contentType) {
  try {
    const key = cacheKey(url);
    await fs.promises.writeFile(path.join(cacheDir, `${key}.bin`), data);
    await fs.promises.writeFile(path.join(cacheDir, `${key}.json`), JSON.stringify({ url, contentType }));
  } catch {
    // Si no se puede guardar, la app sigue funcionando sin caché.
  }
}

function imageResponse(data, contentType) {
  return new Response(data, {
    status: 200,
    headers: {
      'content-type': contentType,
      // Necesario porque las imágenes se cargan con crossOrigin='anonymous'.
      'access-control-allow-origin': '*',
      'cache-control': 'public, max-age=31536000',
    },
  });
}

async function handleRemote(request) {
  if (request.method !== 'GET') {
    return net.fetch(request, { bypassCustomProtocolHandlers: true });
  }

  const cached = await readCached(request.url);
  if (cached) return imageResponse(cached.data, cached.contentType);

  try {
    const res = await net.fetch(request, { bypassCustomProtocolHandlers: true });
    const contentType = res.headers.get('content-type') || '';
    if (res.status === 200 && contentType.startsWith('image/')) {
      const data = Buffer.from(await res.arrayBuffer());
      await writeCached(request.url, data, contentType);
      return imageResponse(data, contentType);
    }
    return res;
  } catch {
    // Sin internet y sin copia guardada.
    return new Response('', { status: 504 });
  }
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 800,
    minHeight: 500,
    backgroundColor: '#000000',
    title: 'NSO Icon Creator',
    icon: path.join(__dirname, '..', 'build', 'icon.png'),
    autoHideMenuBar: true,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  // F11: pantalla completa. F12: herramientas de desarrollo (para depurar).
  win.webContents.on('before-input-event', (event, input) => {
    if (input.type !== 'keyDown') return;
    if (input.key === 'F11') {
      win.setFullScreen(!win.isFullScreen());
      event.preventDefault();
    } else if (input.key === 'F12') {
      win.webContents.toggleDevTools();
      event.preventDefault();
    }
  });

  win.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:\/\//.test(url)) shell.openExternal(url);
    return { action: 'deny' };
  });
  win.webContents.on('will-navigate', (event, url) => {
    if (!url.startsWith('app://')) {
      event.preventDefault();
      if (/^https?:\/\//.test(url)) shell.openExternal(url);
    }
  });

  win.loadURL('app://local/index.html');
}

const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    const [win] = BrowserWindow.getAllWindows();
    if (win) {
      if (win.isMinimized()) win.restore();
      win.focus();
    }
  });

  app.whenReady().then(() => {
    Menu.setApplicationMenu(null);

    // Algunos CDN de imágenes rechazan el user-agent por defecto de Electron.
    const cleanUA = session.defaultSession
      .getUserAgent()
      .replace(/\s*Electron\/\S+/i, '')
      .replace(/(\(KHTML, like Gecko\))\s+\S+\/\S+(\s+Chrome\/)/, '$1$2');
    session.defaultSession.setUserAgent(cleanUA);

    // Carpeta de la caché de imágenes (dentro de los datos de la app).
    cacheDir = path.join(app.getPath('userData'), 'image-cache');
    fs.mkdirSync(cacheDir, { recursive: true });

    protocol.handle('https', handleRemote);

    protocol.handle('app', (request) => {
      const { pathname } = new URL(request.url);
      let rel = decodeURIComponent(pathname);
      if (rel === '/' || rel === '') rel = '/index.html';
      const filePath = path.normalize(path.join(DIST, rel));
      if (!filePath.startsWith(DIST)) {
        return new Response('Forbidden', { status: 403 });
      }
      return net.fetch(pathToFileURL(filePath).toString());
    });

    createWindow();
    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
  });

  app.on('window-all-closed', () => {
    app.quit();
  });
}
