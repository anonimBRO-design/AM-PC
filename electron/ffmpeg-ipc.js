// Pipeline ekspor native FFmpeg (frame PNG via stdin -> MP4 H.264, opsional audio WAV).
// Dipisah dari main.js agar bisa didaftarkan juga oleh skrip uji headless.
const { spawn, spawnSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

let cachedBin = null;

// Urutan pencarian: env AM_FFMPEG_PATH -> ffmpeg di PATH -> paket ffmpeg-static (jika terpasang).
function resolveFfmpeg() {
  if (cachedBin) return cachedBin;
  const candidates = [];
  if (process.env.AM_FFMPEG_PATH) candidates.push(process.env.AM_FFMPEG_PATH);
  candidates.push('ffmpeg');
  try {
    const st = require('ffmpeg-static');
    if (st) candidates.push(String(st).replace('app.asar', 'app.asar.unpacked'));
  } catch (e) { /* ffmpeg-static tidak terpasang */ }
  for (const bin of candidates) {
    try {
      const r = spawnSync(bin, ['-version'], { windowsHide: true, timeout: 8000 });
      if (r.status === 0) {
        cachedBin = { bin, version: String(r.stdout || '').split(/\r?\n/)[0] };
        return cachedBin;
      }
    } catch (e) { /* lanjut kandidat berikutnya */ }
  }
  return null;
}

function register(ipcMain, getWindow) {
  let active = null; // { child, stderr, audioPath, outputPath, done }

  ipcMain.handle('ffmpeg-check', async () => {
    const r = resolveFfmpeg();
    return r
      ? { available: true, bin: r.bin, version: r.version }
      : { available: false, error: 'FFmpeg tidak ditemukan. Pasang FFmpeg dan tambahkan ke PATH, atau set variabel AM_FFMPEG_PATH ke ffmpeg.exe.' };
  });

  ipcMain.handle('ffmpeg-start-session', async (event, opts = {}) => {
    const { outputPath, fps, width, height, bitrate = '12M', audioWav = null } = opts;
    try {
      const r = resolveFfmpeg();
      if (!r) return { success: false, error: 'FFmpeg tidak ditemukan (PATH / AM_FFMPEG_PATH / ffmpeg-static).' };
      if (!outputPath) return { success: false, error: 'outputPath kosong' };
      if (active) { try { active.child.kill(); } catch (e) {} active = null; }

      let audioPath = null;
      if (audioWav && audioWav.byteLength > 44) {
        audioPath = path.join(os.tmpdir(), `am-pc-audio-${Date.now()}.wav`);
        fs.writeFileSync(audioPath, Buffer.from(audioWav));
      }
      const f = String(Math.max(1, +fps || 30));
      const args = ['-y', '-hide_banner', '-f', 'image2pipe', '-vcodec', 'png', '-framerate', f, '-i', 'pipe:0'];
      if (audioPath) args.push('-i', audioPath);
      // Lebar/tinggi H.264 yuv420p wajib genap.
      const vf = (width && height)
        ? `scale=${2 * Math.round(width / 2)}:${2 * Math.round(height / 2)}`
        : 'scale=trunc(iw/2)*2:trunc(ih/2)*2';
      args.push('-vf', vf, '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-preset', 'veryfast', '-b:v', String(bitrate), '-r', f);
      if (audioPath) args.push('-map', '0:v:0', '-map', '1:a:0', '-c:a', 'aac', '-b:a', '192k', '-shortest');
      args.push('-movflags', '+faststart', outputPath);

      const child = spawn(r.bin, args, { stdio: ['pipe', 'ignore', 'pipe'], windowsHide: true });
      const session = { child, stderr: '', audioPath, outputPath };
      session.done = new Promise((resolve) => {
        child.on('error', (err) => { session.stderr += '\n' + err.message; });
        child.on('close', (code) => {
          if (audioPath) { try { fs.unlinkSync(audioPath); } catch (e) {} }
          if (active === session) active = null;
          const win = getWindow && getWindow();
          if (win && !win.isDestroyed()) win.webContents.send('ffmpeg-session-closed', { code, outputPath });
          resolve({ code, stderrTail: session.stderr.slice(-2000) });
        });
      });
      child.stderr.on('data', (d) => { session.stderr = (session.stderr + d).slice(-20000); });
      child.stdin.on('error', () => {});
      active = session;
      return { success: true, bin: r.bin };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('ffmpeg-feed-frame', async (event, buffer) => {
    if (!active || !active.child.stdin || active.child.stdin.destroyed) {
      return { success: false, error: 'Sesi FFmpeg tidak aktif', stderrTail: active ? active.stderr.slice(-1000) : '' };
    }
    const stdin = active.child.stdin;
    return new Promise((resolve) => {
      const ok = stdin.write(Buffer.from(buffer));
      if (ok) resolve({ success: true });
      else stdin.once('drain', () => resolve({ success: true }));
    });
  });

  // Menunggu proses ffmpeg selesai, mengembalikan kode keluar + ekor stderr.
  ipcMain.handle('ffmpeg-end-session', async () => {
    if (!active) return { success: true, code: null };
    const session = active;
    try { session.child.stdin.end(); } catch (e) {}
    const res = await session.done;
    return { success: res.code === 0, code: res.code, outputPath: session.outputPath, stderrTail: res.stderrTail };
  });

  ipcMain.handle('ffmpeg-abort-session', async () => {
    if (active) { try { active.child.kill(); } catch (e) {} active = null; }
    return { success: true };
  });
}

module.exports = { register, resolveFfmpeg };
