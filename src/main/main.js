const { app, BrowserWindow, ipcMain, Tray, Menu, nativeImage } = require('electron');
const path = require('path');

let mainWindow;
let tray;

// Deteksi mode development (Vite dev server berjalan di port 5173)
const isDev = !app.isPackaged;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1000,
    height: 700,
    frame: false,
    transparent: true,
    resizable: false,
    skipTaskbar: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  // Load URL berdasarkan mode
  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
    // Buka DevTools di mode dev (comment jika tidak perlu)
    // mainWindow.webContents.openDevTools({ mode: 'detach' });
  } else {
    mainWindow.loadFile(path.join(__dirname, '../../dist/index.html'));
  }

  // Sembunyikan ke tray saat ditutup (bukan quit)
  mainWindow.on('close', (event) => {
    if (!app.isQuitting) {
      event.preventDefault();
      mainWindow.hide();
    }
  });
}

function createTray() {
  // Buat icon tray sederhana (16x16 pixel ungu)
  const icon = nativeImage.createFromBuffer(
    Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAARklEQVQ4T2P8z8Dwn4EIwMjAwMBEjHpmBgYGJmI0MDMwMDARo4GZgYGBiRgNzAwMDEzEaGBmYGAgOhaYiQ0DZgYGBiYAKHwIEVHjG3EAAAAASUVORK5CYII=',
      'base64'
    )
  );

  tray = new Tray(icon);
  tray.setToolTip('Widget Keuangan');

  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Tampilkan Widget',
      click: () => {
        if (mainWindow) {
          mainWindow.show();
          mainWindow.focus();
        }
      },
    },
    { type: 'separator' },
    {
      label: 'Keluar',
      click: () => {
        app.isQuitting = true;
        app.quit();
      },
    },
  ]);

  tray.setContextMenu(contextMenu);

  // Klik icon tray = toggle show/hide
  tray.on('click', () => {
    if (mainWindow) {
      if (mainWindow.isVisible()) {
        mainWindow.hide();
      } else {
        mainWindow.show();
        mainWindow.focus();
      }
    }
  });
}

function setupIPC() {
  // Lazy-load database (hanya saat IPC dipanggil)
  const database = require('./database');

  ipcMain.handle('get-transaksi', () => {
    return database.getAll();
  });

  ipcMain.handle('get-ringkasan', () => {
    return database.getRingkasan();
  });

  ipcMain.handle('simpan-transaksi', (_event, data) => {
    return database.insert(data);
  });

  ipcMain.handle('hapus-transaksi', (_event, id) => {
    return database.deleteById(id);
  });

  ipcMain.handle('close-window', () => {
    if (mainWindow) {
      mainWindow.hide();
    }
  });

  ipcMain.handle('resize-window', (_event, width, height) => {
    if (mainWindow) {
      mainWindow.setSize(width, height, true); // true for animation if supported
    }
  });
}

// ─── App Lifecycle ───────────────────────────────────────────────

app.whenReady().then(() => {
  setupIPC();
  createWindow();
  createTray();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', () => {
  app.isQuitting = true;
});
