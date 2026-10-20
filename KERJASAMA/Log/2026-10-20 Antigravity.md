# Log 2026-10-20 — Antigravity

## Ringkasan

1. **Sinkronisasi Upstream Open-Motion V5.285**:
   - Upstream `Hada45/Open-Motion` merilis versi V5.283, V5.284, dan V5.285.
   - Hash blob `index.html` upstream berubah dari `5c602db41fe5cde3ba39d9363f1e3a1ece9a14e5` (V5.238) menjadi `4df41ae4374054cd5177170c6110918e4f8b59e9` (V5.285).
   - Sinkronisasi bersih selektif hanya untuk berkas upstream:
     - `git checkout upstream/main -- index.html CHANGELOG.md`
   - Hash blob lokal terverifikasi 100% identik dengan upstream: `4df41ae4374054cd5177170c6110918e4f8b59e9`.

2. **Fitur Baru Upstream yang Masuk**:
   - **V5.283**:
     - Pull request #33 kita (`anonimBRO-design/feat/keyboard-shortcuts-remapping`) resmi di-merge upstream ke core!
     - Dedicated group timelines dengan breadcrumb navigation, Mask & Exclude groups.
     - Inspector border & shadow controls, audio spectrum, scatter repeat caching, 190-layer XML roundtrip, WebGL1/2 compatibility improvements.
   - **V5.284**:
     - Overhaul Add Object drawer (`+`) diselaraskan 1:1 Alight Motion v5.0.273 (`activity_edit_addpopup.xml parity`): 5 tab (Shapes, Elements, Media, Audio, Templates) + quick-add rail kanan (Freehand, Vector, Text, Close).
     - Bentuk vektor parametrik baru: plus, heart, pie, crescent/moon.
     - Ekspor frame rate diperluas hingga 240 FPS (auto-sync FPS proyek).
   - **V5.285**:
     - Animasi tutup drawer halus (`.drawerClosing`) untuk bottom sheet dan desktop dock.
     - Opsi "Jangan tampilkan lagi" di modal eksperimen (sinkronisasi `localStorage`).
     - Empty state tab proyek berlatar gelap kontras tinggi.

3. **Pengujian Kompatibilitas Wrapper Desktop & FFmpeg Lolos 100%**:
   - `scratch/check_finder.js`: Tombol `homeAMFinder` dan `homeAMHub` sukses dimount di header beranda pada frame 0.
   - `scratch/verify_shortcuts.js`: Dialog shortcut `#amShortcutsModal` bertema gelap `#121820` tampil tajam tanpa blur.
   - `scratch/test_ffmpeg_export.js`: Ekspor video MP4 30 frame H.264 via pipeline native FFmpeg sukses (`51.391 bytes`, 1.000000s duration, valid ffprobe).
   - `scratch/verify_v5285_ui.js`: Home, Editor Studio widescreen, dan Add Object drawer 5-tab berjalan dengan 0 console error.

4. **Kompilasi Standalone Portable Exe**:
   - Berhasil menjalankan `node scripts/build-portable.js`.
   - Menghasilkan rilis terbaru: `release/Alight-Motion-PC-win-x64/Alight Motion PC.exe` versi V5.285 dengan metadata dan icon resmi Alight Motion tersemat.
