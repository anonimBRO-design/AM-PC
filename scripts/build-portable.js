const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');
const distSource = path.join(rootDir, 'node_modules', 'electron', 'dist');
const targetDir = path.join(rootDir, 'release', 'Alight-Motion-PC-win-x64');
const targetAppDir = path.join(targetDir, 'resources', 'app');

console.log('====================================================');
console.log('📦 Building Alight Motion PC Standalone Portable App');
console.log('====================================================\n');

// 1. Ensure clean target directory
if (fs.existsSync(targetDir)) {
  console.log('Removing old build...');
  try {
    fs.rmSync(targetDir, { recursive: true, force: true });
  } catch (err) {
    if (err.code === 'EPERM' || err.code === 'EBUSY') {
      console.error('\n⚠️ Gagal menghapus folder build lama karena aplikasi sedang berjalan!');
      console.error('Silakan tutup aplikasi "Alight Motion PC" terlebih dahulu lalu jalankan skrip build kembali.\n');
      process.exit(1);
    }
    throw err;
  }
}
fs.mkdirSync(targetDir, { recursive: true });

// 2. Copy Electron distribution
console.log('Copying Electron runtime binaries...');
fs.cpSync(distSource, targetDir, { recursive: true });

// 3. Rename electron.exe to "Alight Motion PC.exe"
const oldExe = path.join(targetDir, 'electron.exe');
const newExe = path.join(targetDir, 'Alight Motion PC.exe');
if (fs.existsSync(oldExe)) {
  fs.renameSync(oldExe, newExe);
  console.log('✓ Renamed executable to "Alight Motion PC.exe"');
}

// 4. Remove default_app.asar
const defaultAsar = path.join(targetDir, 'resources', 'default_app.asar');
if (fs.existsSync(defaultAsar)) {
  fs.unlinkSync(defaultAsar);
  console.log('✓ Removed default_app.asar');
}

// 5. Create resources/app directory
fs.mkdirSync(targetAppDir, { recursive: true });

// 6. Copy App Assets
const filesToCopy = [
  'index.html',
  'package.json',
  'manifest.webmanifest'
];

for (const f of filesToCopy) {
  const src = path.join(rootDir, f);
  const dest = path.join(targetAppDir, f);
  if (fs.existsSync(src)) {
    fs.copyFileSync(src, dest);
    console.log(`✓ Copied ${f}`);
  }
}

const dirsToCopy = [
  'css',
  'electron',
  'icons'
];

for (const d of dirsToCopy) {
  const src = path.join(rootDir, d);
  const dest = path.join(targetAppDir, d);
  if (fs.existsSync(src)) {
    fs.cpSync(src, dest, { recursive: true });
    console.log(`✓ Copied directory ${d}/`);
  }
}

// 7. Embed official Alight Motion icon and Windows executable metadata via rcedit
(async () => {
  try {
    const { rcedit } = require('rcedit');
    const icoPath = path.join(rootDir, 'icons', 'alight-motion.ico');
    if (fs.existsSync(icoPath) && fs.existsSync(newExe)) {
      console.log('Embedding Alight Motion icon & metadata into executable...');
      await rcedit(newExe, {
        icon: icoPath,
        'version-string': {
          CompanyName: 'Alight Creative & AM-PC Team',
          FileDescription: 'Alight Motion PC — Motion Graphics & Visual Effects Studio',
          ProductName: 'Alight Motion PC',
          LegalCopyright: 'Copyright © 2026 Alight Motion PC',
          OriginalFilename: 'Alight Motion PC.exe',
          InternalName: 'Alight Motion PC'
        }
      });
      console.log('✓ Successfully embedded official Alight Motion icon into "Alight Motion PC.exe"!');
    }
  } catch (err) {
    console.warn('⚠️ Could not embed icon with rcedit (optional):', err.message);
  }

  console.log('\n====================================================');
  console.log('🎉 Build Selesai!');
  console.log(`📂 Lokasi Aplikasi: ${targetDir}`);
  console.log(`🚀 File Eksekusi:   ${newExe}`);
  console.log('====================================================\n');
})();

