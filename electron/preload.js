const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('desktopAPI', {
  isElectron: true,
  platform: process.platform,

  // Window Controls
  minimizeWindow: () => ipcRenderer.send('window-minimize'),
  maximizeWindow: () => ipcRenderer.send('window-maximize'),
  closeWindow: () => ipcRenderer.send('window-close'),
  isMaximized: () => ipcRenderer.invoke('window-is-maximized'),
  onMaximizedState: (callback) => {
    ipcRenderer.on('window-maximized-state', (event, state) => callback(state));
  },

  // Native Dialogs & File System
  openProjectDialog: () => ipcRenderer.invoke('dialog-open-project'),
  saveProjectDialog: (options) => ipcRenderer.invoke('dialog-save-project', options),
  openMediaDialog: () => ipcRenderer.invoke('dialog-open-media'),
  readFileBuffer: (filePath) => ipcRenderer.invoke('read-file-buffer', filePath),

  // FFmpeg Native Frame-by-Frame Pipeline
  ffmpegCheck: () => ipcRenderer.invoke('ffmpeg-check'),
  saveVideoDialog: (options) => ipcRenderer.invoke('dialog-save-video', options),
  ffmpegStartSession: (options) => ipcRenderer.invoke('ffmpeg-start-session', options),
  ffmpegFeedFrame: (buffer) => ipcRenderer.invoke('ffmpeg-feed-frame', buffer),
  ffmpegEndSession: () => ipcRenderer.invoke('ffmpeg-end-session'),
  onFfmpegClosed: (callback) => {
    ipcRenderer.on('ffmpeg-session-closed', (event, data) => callback(data));
  },
  showItemInFolder: (filePath) => ipcRenderer.invoke('shell-show-item', filePath)
});
