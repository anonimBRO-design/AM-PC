const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron');
const path = require('path');
const fs = require('fs');

// Configure Native App Identity
app.name = 'Alight Motion PC';
if (process.platform === 'win32') {
  app.setAppUserModelId('com.alightmotion.pc');
}

let mainWindow = null;

function createWindow() {
  const iconPath = process.platform === 'win32' && fs.existsSync(path.join(__dirname, '../icons/alight-motion.ico'))
    ? path.join(__dirname, '../icons/alight-motion.ico')
    : path.join(__dirname, '../icons/alight-motion-512.png');

  mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1024,
    minHeight: 680,
    frame: true,
    autoHideMenuBar: true,
    backgroundColor: '#121316',
    title: 'Open Motion Studio',
    icon: iconPath,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
      webSecurity: false // Enables direct local video/audio streaming and drag-drop
    }
  });

  mainWindow.webContents.on('console-message', (event, level, message, line, sourceId) => {
    console.log(`[Renderer ${level}] ${message} (${sourceId}:${line})`);
  });

  mainWindow.loadFile(path.join(__dirname, '../index.html'));

  // Window state change notifications
  mainWindow.on('maximize', () => {
    mainWindow.webContents.send('window-maximized-state', true);
  });

  mainWindow.on('unmaximize', () => {
    mainWindow.webContents.send('window-maximized-state', false);
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });
}

// App lifecycle
app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// ==========================================
// IPC HANDLERS: WINDOW MANAGEMENT
// ==========================================
ipcMain.on('window-minimize', () => {
  if (mainWindow) mainWindow.minimize();
});

ipcMain.on('window-maximize', () => {
  if (!mainWindow) return;
  if (mainWindow.isMaximized()) {
    mainWindow.unmaximize();
  } else {
    mainWindow.maximize();
  }
});

ipcMain.on('window-close', () => {
  if (mainWindow) mainWindow.close();
});

ipcMain.handle('window-is-maximized', () => {
  return mainWindow ? mainWindow.isMaximized() : false;
});

// ==========================================
// IPC HANDLERS: NATIVE FILE SYSTEM & DIALOGS
// ==========================================
ipcMain.handle('dialog-open-project', async () => {
  if (!mainWindow) return { canceled: true };
  const result = await dialog.showOpenDialog(mainWindow, {
    title: 'Buka Proyek Alight Motion PC',
    filters: [
      { name: 'Alight Motion Projects & Presets', extensions: ['amproj', 'amp', 'json', 'xml'] },
      { name: 'Alight Motion Project (.amproj)', extensions: ['amproj', 'amp'] },
      { name: 'Alight Motion XML Preset (.xml)', extensions: ['xml'] },
      { name: 'JSON Project (.json)', extensions: ['json'] },
      { name: 'Semua File', extensions: ['*'] }
    ],
    properties: ['openFile']
  });

  if (result.canceled || result.filePaths.length === 0) {
    return { canceled: true };
  }

  const filePath = result.filePaths[0];
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    return {
      canceled: false,
      filePath,
      fileName: path.basename(filePath),
      ext: path.extname(filePath).toLowerCase(),
      content
    };
  } catch (err) {
    return { canceled: true, error: err.message };
  }
});

ipcMain.handle('dialog-save-project', async (event, { defaultName, content, ext = 'amproj' }) => {
  if (!mainWindow) return { canceled: true };
  const result = await dialog.showSaveDialog(mainWindow, {
    title: 'Simpan Proyek Alight Motion',
    defaultPath: defaultName ? `${defaultName}.${ext}` : `Project_Baru.${ext}`,
    filters: [
      { name: 'Alight Motion Project (.amproj)', extensions: ['amproj'] },
      { name: 'JSON Project (.json)', extensions: ['json'] },
      { name: 'Alight Motion XML Preset (.xml)', extensions: ['xml'] }
    ]
  });

  if (result.canceled || !result.filePath) {
    return { canceled: true };
  }

  try {
    fs.writeFileSync(result.filePath, content, 'utf-8');
    return {
      canceled: false,
      filePath: result.filePath,
      fileName: path.basename(result.filePath)
    };
  } catch (err) {
    return { canceled: true, error: err.message };
  }
});

ipcMain.handle('dialog-open-media', async () => {
  if (!mainWindow) return { canceled: true };
  const result = await dialog.showOpenDialog(mainWindow, {
    title: 'Impor Media (Video / Audio / Gambar / Font)',
    filters: [
      { name: 'Media Files', extensions: ['mp4', 'mov', 'webm', 'png', 'jpg', 'jpeg', 'gif', 'mp3', 'wav', 'ogg', 'ttf', 'otf'] },
      { name: 'Video Files', extensions: ['mp4', 'mov', 'webm'] },
      { name: 'Audio Files', extensions: ['mp3', 'wav', 'ogg'] },
      { name: 'Image Files', extensions: ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg'] },
      { name: 'Font Files', extensions: ['ttf', 'otf', 'woff', 'woff2'] },
      { name: 'Semua File', extensions: ['*'] }
    ],
    properties: ['openFile', 'multiSelections']
  });

  if (result.canceled) return { canceled: true };

  const files = result.filePaths.map(fp => ({
    filePath: fp,
    fileName: path.basename(fp),
    ext: path.extname(fp).toLowerCase()
  }));

  return { canceled: false, files };
});

ipcMain.handle('read-file-buffer', async (event, filePath) => {
  try {
    const buffer = fs.readFileSync(filePath);
    return { success: true, buffer };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

// ==========================================
// IPC HANDLERS: NATIVE FFMPEG EXPORT PIPELINE
// ==========================================
const { spawn } = require('child_process');
let activeFfmpeg = null;

ipcMain.handle('ffmpeg-check', async () => {
  return new Promise((resolve) => {
    const p = spawn('ffmpeg', ['-version']);
    p.on('error', () => resolve(false));
    p.on('close', (code) => resolve(code === 0));
  });
});

ipcMain.handle('dialog-save-video', async (event, { defaultName, ext = 'mp4' }) => {
  if (!mainWindow) return { canceled: true };
  const result = await dialog.showSaveDialog(mainWindow, {
    title: 'Simpan Video Alight Motion PC',
    defaultPath: defaultName ? `${defaultName}.${ext}` : `Video_Alight_Motion.${ext}`,
    filters: [
      { name: 'Video MP4 (*.mp4)', extensions: ['mp4'] },
      { name: 'Video WebM Transparent (*.webm)', extensions: ['webm'] },
      { name: 'Semua File', extensions: ['*'] }
    ]
  });
  if (result.canceled || !result.filePath) return { canceled: true };
  return { canceled: false, filePath: result.filePath };
});

ipcMain.handle('ffmpeg-start-session', async (event, { outputPath, fps, width, height, bitrate = '12M' }) => {
  try {
    if (activeFfmpeg) {
      try { activeFfmpeg.kill(); } catch (e) {}
      activeFfmpeg = null;
    }

    const args = [
      '-y',
      '-f', 'image2pipe',
      '-vcodec', 'png',
      '-r', String(fps),
      '-i', 'pipe:0',
      '-c:v', 'libx264',
      '-pix_fmt', 'yuv420p',
      '-preset', 'veryfast',
      '-b:v', String(bitrate),
      '-movflags', '+faststart',
      outputPath
    ];

    const child = spawn('ffmpeg', args, { stdio: ['pipe', 'ignore', 'pipe'] });
    activeFfmpeg = child;

    child.on('close', (code) => {
      activeFfmpeg = null;
      if (mainWindow) {
        mainWindow.webContents.send('ffmpeg-session-closed', { code, outputPath });
      }
    });

    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('ffmpeg-feed-frame', async (event, buffer) => {
  if (!activeFfmpeg || !activeFfmpeg.stdin || activeFfmpeg.stdin.destroyed) {
    return { success: false, error: 'FFmpeg session is not active' };
  }
  return new Promise((resolve) => {
    const ok = activeFfmpeg.stdin.write(Buffer.from(buffer), () => {
      resolve({ success: true });
    });
    if (!ok) {
      activeFfmpeg.stdin.once('drain', () => resolve({ success: true }));
    }
  });
});

ipcMain.handle('ffmpeg-end-session', async () => {
  if (!activeFfmpeg) return { success: true };
  return new Promise((resolve) => {
    activeFfmpeg.stdin.end(() => {
      resolve({ success: true });
    });
  });
});

ipcMain.handle('shell-show-item', async (event, filePath) => {
  try {
    shell.showItemInFolder(filePath);
    return { success: true };
  } catch (e) {
    return { success: false, error: e.message };
  }
});

