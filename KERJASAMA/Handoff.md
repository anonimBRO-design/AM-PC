# Handoff — State Terkini

> **File ini DITIMPA, bukan ditambahi.** Selalu cerminkan kondisi terkini.
> Terakhir diperbarui: 11 Okt 2026 · oleh: Antigravity

Bagian dari [[README|protokol kerja bersama]].
Aturan kerja: [[Aturan]] · Jebakan: [[Jebakan]] · Fakta: [[Fakta]]

---

## Sedang apa

**Aktif Paralel (Antigravity & Hermes) pada proyek AM-Native-Desktop**:
- **Antigravity (SELESAI Tahap 1 & 2)**:
  - ✅ **Root Cause Kanvas Pink Terpecahkan**: Memperbaiki `parseHexColor()` untuk format Android/AM `#AARRGGBB` (sebelumnya `#ff000000` hitam terbaca merah R=1.0) dan menghapus `gl.clearColor` layar penuh di `renderBaseLayerContent()`.
  - ✅ **Rendering Transform Quad & Media**: Membuat `layerProgram` WebGL2 dengan `uMatrix` (mat4 2D orthographic + transform), `uColor`, dan `uUseTexture`. Mengintegrasikan `MediaManager` milik Hermes ke dalam `WebGL2Renderer`.
  - ✅ **Overhaul Parser XML (`am-xml-parser.ts`)**: Mendukung parsing rekursif `<embedScene>`, resolusi aset `<media>`, pembacaan timing milidetik, transformasi `<transform>` (`location`, `scale`, `rotation`, `opacity`, `pivot`), ukuran `<size>`, dan keyframe `<kf>`. Berhasil mengimpor project riil Alight Motion 50 track secara akurat.
  - ✅ **Sanitasi Shader Pipeline**: Menaikkan pass rate kompilasi shader dari **60.2%** menjadi **95.5%** (257 dari 269 shader pass, hanya tersisa 12 efek).
  - ✅ **Pembersihan Emoji 100%**: Membersihkan semua sisa karakter emoji di UI (`timeline-panel.ts`, `inspector-panel.ts`, `studio-ui.ts`, `main.ts`).
  - ✅ **Verifikasi Visual**: Berhasil diuji coba dan menghasilkan screenshot bukti `screenshot_imported_xml_rendered.png` dan `screenshot_effects_applied.png`.
- **Hermes (SELESAI poin 1–3, poin 4 menunggu keputusan user)**:
  - ✅ Ikon: `KNOWN_THUMB_MAP` (105 entri dari `commonMap` AM-PC) + normalizer snake-case → resolusi 55 → **276/328 (84,1%)**. Commit `d8f52c8`.
  - ✅ Fix bug parser param `bundle-effects.js`: tag `choice`/`hue-disc`/`float` + dedupe id duplikat (18 efek) → shader pass-rate 148 → 162/269.
  - ✅ `src/engine/media-manager.ts` (467 baris, texImage2D loader; **sudah di-wire sempurna oleh Antigravity**).
  - ✅ Batch test shader: `npm run verify:shaders` → laporan `scratch/shader-batch-report.json`.
  - 🔶 Remote GitHub: `origin` **sudah di-set** ke `anonimBRO-design/AM-Native-Desktop`; push tertunda — repo belum dibuat di GitHub (tugas user) + kredensial tidak tersedia di sesi non-tty. Retry `git push -u origin main` setelah repo ada.

| Agent | Status | Fokus Area |
|---|---|---|
| **Antigravity** | ✅ Selesai Tahap 1 & 2 | WebGL2 Engine, Quad Transform, XML Parser Overhaul, 95.5% Shader Pass, Zero Emojis |
| **Hermes** | ✅ Poin 1–3 selesai · ⏳ Poin 4 (remote) | Ikon KnownMap, Media Loader, QA Suite, Git Remote |

---

## Kondisi proyek

**AM-PC** — fork dari [Hada45/Open-Motion](https://github.com/Hada45/Open-Motion),
dibungkus jadi aplikasi desktop Windows.

| Aspek | State |
|---|---|
| `index.html` | ✅ Sama persis dengan upstream (lihat [[Fakta]] F-01) |
| Versi | Open Motion **V5.209** |
| Nama & Judul | ✅ **Alight Motion PC** (teks 'Single HTML' & 'Open Motion V5.209' dihapus dari title/brand) |
| Brand Logo | ✅ Logo resmi Alight Motion (presisi pas squircle `test_prime_am.png`, tanpa offset border) |
| Dialog Notice | ✅ Muncul pada startup, teks di-rebrand ke **Alight Motion PC**, tombol `INFO` di top bar permanen dan aktif dengan Container Transform Morphing |
| Thumbnail Proyek | ✅ **Auto-capture detik ke-1 (1.0s)** via `window.omsTimelinePreRender.renderer` + 2D canvas fallback, sinkron otomatis dari IndexedDB & cache |
| Animasi Tombol | ✅ **Android Touch Ripple + Adaptive Micro-Press** (gelombang sentuh memancar dari titik klik + scale 0.97 di semua elemen interaktif) |
| Animasi Modal/Popup | ✅ **Universal Container Transform Morphing** (aktif di semua popup: Proyek Baru, Bahasa, Aksi Layer, Notice Info, AM Finder/Hub; mekar dari tombol asal & reverse shrink saat ditutup) |
| Tombol Proyek Baru | ✅ Tampil stabil di sebelah filter "Terbaru", tidak hilang saat modal ditutup |
| Font | ✅ **Inter** (tajam, bersih, mudah dibaca di PC) |
| AM Finder | ✅ Tombol `AMFINDER` aktif di top bar (modal in-app, tetap di dalam exe) |
| AM Hub | ✅ Tombol `AMHUB` aktif di top bar (modal in-app, tetap di dalam exe) |
| Web Modal UX | ✅ **Draggable** (dapat digeser bebas), **Maximize/Restore**, dan **Split View 50:50** dengan divider resizer |
| Multi-Select Relink | ✅ **Tautkan Ulang Media** hadir di drawer kanan saat multi-select layer, tombol "Ganti Semua Sekaligus (N Media)", per-media link button, batch auto-relink, dan tombol "Batalkan Pilihan" |
| Adjustment Layers | ✅ **Backdrop Capture Engine** aktif untuk efek Alight Motion (`magnifybg`, `copybg`, `lift`, `displacemap3`); Wave Warp & efek lainnya mendistorsi background gambar/video di bawahnya tanpa balok hijau/merah solid |
| Timeline Stability | ✅ **Anti-Jump & Anti-Focus Collapse** aktif (klik layer tidak lagi loncat ke atas atau mengkolaps track lain ke 29px) |
| Mouse Selection | ✅ **Anti-LongPress Mouse** aktif (klik biasa mouse tidak memicu timer 360ms multi-select sentuh ponsel) |
| CSS Desktop | ✅ Aktif disuntikkan via Electron `insertCSS` (lihat [[Fakta]] F-03) |
| Inspector Dock | ✅ Docked rapi di panel kanan atas 400px, 2-kolom compact |
| Build `.exe` | ✅ Ada di `release/Alight-Motion-PC-win-x64/` (file release tersinkronisasi) |
| Aplikasi | ✅ Berjalan normal di desktop |
| Repo | `anonimBRO-design/AM-PC` |

---

## Yang sudah dikerjakan

### Antigravity (10 Okt 2026 - Bagian 10: Multi-Select Media Relinker, Anti-Jump Timeline & Mouse Protection)
- **Multi-Select Media Relinker**: Menambahkan kartu "Tautkan Ulang Media" di drawer kanan saat multi-selection mencakup layer media hilang. Menyediakan link file picker per layer, batch relink (menemukan file berdasar nama di folder yang sama), dan tombol "Batalkan Pilihan".
- **Anti-Jump & Anti-Focus Collapse**: Menetralkan `omsFocusTrackActive` dan scroll focus jump saat layer diklik, sehingga track timeline tidak mengkolaps ke 29px atau melompat ke atas.
- **Mouse Anti-LongPress**: Membedakan klik mouse biasa dengan touch long-press agar tidak memicu selection mode secara tidak sengaja.
- **Commit & Sync**: Tersimpan di branch `main` (`baed0db`), siap pakai di AM-PC desktop.

### Antigravity (10 Okt 2026 - Bagian 11: Kontribusi Upstream PR — Project Thumbnails)
- **Branch Khusus PR**: Dibuat branch `feat/project-thumbnails` langsung dari `upstream/main` tanpa file desktop apa pun.
- **Fitur Thumbnail Otomatis**:
  - `OMSPersistentStore.captureProjectThumbnail()`: Mengambil snapshot WebP ringan (160px width, kualitas 0.82) dari canvas render saat autosave / save project.
  - Tersimpan di `project.thumb` dan `meta.thumb` (IndexedDB + localStorage index).
  - Tampil di beranda pada kartu proyek (`<img class="projectThumbImg">`) dengan styling responsive cover.
  - Kompatibel penuh dan fallback rapi jika thumbnail belum ada.
  - Menghindari race condition dengan `await this.writeQueue` pada `listProjects()`.
- **Status PR Branch**: Berhasil diuji via Electron test runner dan sudah di-push ke remote `origin feat/project-thumbnails`. Ready to PR to `Hada45/Open-Motion`.
- **Posisi Workspace**: Workspace saat ini telah dikembalikan ke branch `main`.

### Antigravity (10 Okt 2026 - Bagian 12: Batch Media Replace & Alight Motion Adjustment Layer Engine)
- **Tombol "Ganti Semua Sekaligus"**: Pada multi-select drawer, tersedia tombol gradien hijau-cyan neon untuk mengganti seluruh media yang dipilih dengan 1 kali pemilihan file dari PC (`applyFileToMediaLayers`). Asset di-persist ke IndexedDB `assets`, layer di-update dan di-hydrate serentak, serta tekstur di-reset.
- **Backdrop Capture & Adjustment Layer Support**: Memperbaiki bug balok warna hijau/kuning pekat pada proyek Alight Motion (seperti detik 14s-17s `CelzPredct 🍁 1:1` yang memakai `magnifybg` + `Wave Warp`).
- **Hook Kompositor AM (`window.omsAMGPU.compose`)**:
  - Mengidentifikasi layer penyesuaian (`magnifybg`, `copybg`, `lift` dengan `fill=0`, `displacemap3`).
  - Menyalin backdrop komposisi (`comp.tex`) ke buffer sumber (`source`) secara real-time.
  - Menjalankan rantai efek asli AM (`tile`, `wavewarp2`) langsung di atas backdrop foto/video.
  - Mendukung masking batas bentuk (`shape mask`) jika layer tidak berukuran layar penuh.
  - Menyediakan fallback pada `WebGLRenderer.prototype.paintTexture` untuk jalur raster/2D.
- **Pengujian Pixel-Level**: Diverifikasi di Electron headless; pixel tengah yang tadinya balok hijau `#cdfa43` (`[191, 243, 48, 255]`) berhasil berubah menjadi gambar latar terdistorsi wave warp (`[235, 235, 235, 255]`) dengan 0% warna hijau solid.
- **Sinkronisasi**: Tersinkronisasi penuh ke `release/Alight-Motion-PC-win-x64/resources/app/`.

---

## Yang belum dikerjakan

| # | Hal | Catatan |
|---|---|---|
| 1 | Skrip sync otomatis | Belum ada. Sekarang sync manual jika ada rilis upstream baru. |

---

## Aturan penting untuk agent berikutnya

1. **`index.html` sudah terbaru — jangan sync ulang.** Cek hash dulu sebelum percaya git log. Lihat [[Aturan]] §3.
2. **Jangan edit `index.html` langsung.** Kalau perlu tambah sesuatu, taruh di file terpisah (`css/`, `electron/`). Lihat [[Fakta]] F-02.
3. **File milik Antigravity**: `electron/`, `scripts/`, `css/`, `icons/`, `README.md`. Minta izin dulu sebelum menyentuh.
4. **Tulis fakta baru di [[Fakta]]** setelah verifikasi — biar agent berikutnya tidak bongkar ulang.

---

## Cara sync ke upstream (kalau memang perlu)

```bash
git fetch upstream
git rev-parse HEAD:index.html
git rev-parse upstream/main:index.html

# Kalau hash SAMA -> berhenti, tidak perlu sync.
# Kalau BEDA -> baru lanjut:
git checkout upstream/main -- index.html
git add index.html
git commit -m "sync: index.html ke upstream"
```

---

## Riwayat file ini

| Tanggal | Oleh | Perubahan |
|---|---|---|
| 9 Okt 2026 | Claude Code | Dibuat pertama kali |
| 10 Okt 2026 | Antigravity | Pembaruan status CSS aktif dan build baru |
| 10 Okt 2026 | Antigravity | Inspector docking fix, compact layout, dan AM Cyan Hitbox implementation |
| 10 Okt 2026 | Antigravity | Rebranding Alight Motion PC, AM Finder & AM Hub in-app, font Inter, cancel hitbox |
| 10 Okt 2026 | Antigravity | Perbaikan auto-thumbnail 1.0s (WebGL + fallback) dan pemulihan modal experimental notice + tombol INFO |
| 10 Okt 2026 | Antigravity | Implementasi global Android Touch Ripple + Adaptive Micro-Press di seluruh elemen aplikasi |
| 10 Okt 2026 | Antigravity | Implementasi Container Transform Modal Morph Engine |
| 10 Okt 2026 | Antigravity | Fix modal backdrop freeze, restore tombol PROYEK BARU, dan perluas Morph Engine ke seluruh popup aplikasi |
| 10 Okt 2026 | Antigravity | Multi-Select Media Relinker, netralisasi timeline focus session jump, dan proteksi mouse long-press |
