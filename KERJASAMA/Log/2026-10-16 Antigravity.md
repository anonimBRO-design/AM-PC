# Log Kerja — 16 Okt 2026 · Antigravity

## Ringkasan Tugas
Memperbagus dan menyamakan paritas fitur, engine render WebGL2, UI/UX desktop, alur kerja (workflow), dan pipeline ekspor pada proyek **`AM-Native-Desktop`** (`d:\project afgan dkk\AM-Native-Desktop`) dengan menjadikan **`AM-PC`** (`d:\project afgan dkk\AM-PC`) sebagai patokan standar emas (`gold-standard benchmark`) berdasarkan hasil wawancara `/grill-me` 4 cabang arsitektur.

---

## 1. Cabang 1 — Engine Render WebGL2 & Paritas Visual (`AM-PC` Benchmark)
- **Adjustment Layer & Backdrop Capture (Port Fakta F-18 AM-PC)** (`src/engine/webgl2-renderer.ts`):
  - Mendeteksi layer penyesuaian latar belakang (`com.alightcreative.effects.magnifybg`, `copybg`, `lift` dengan `fill <= 0.001`, dan `displacemap3`).
  - Menyalin hasil komposisi sementara di bawah layer ke `backdropFBO` / `backdropTexture` dan melakukan *masking* dengan bentuk geometri layer (`maskProgram`) sehingga distorsi (seperti `wavewarp2`, `tile`, `exposure`) hanya mengenai area bentuk layer tanpa memunculkan balok warna solid (`#cdfa43`).
- **Compositor 24 Blend Mode + 4 Track Matte Mode** (`src/engine/shader-pipeline.ts`, `src/engine/webgl2-renderer.ts`):
  - Membuat shader komposit GLSL ES 3.00 (`COMPOSITE_FRAGMENT_SHADER`) yang mendukung penuh 24 mode blend Alight Motion (`normal`, `multiply`, `screen`, `overlay`, `darken`, `lighten`, `color-dodge`, `color-burn`, `linear-dodge`, `linear-burn`, `hard-light`, `soft-light`, `vivid-light`, `linear-light`, `pin-light`, `hard-mix`, `difference`, `exclusion`, `subtract`, `divide`, `hue`, `saturation`, `color`, `luminosity`) dan 4 mode Track Matte (`alpha`, `alpha-inverted`, `luma`, `luma-inverted`) serta grup masking (`blending="mask"` / `"exclude"`).
- **Hierarki Transformasi Parent & Pivot (`layer.origin`) + Parser XML Lengkap** (`src/engine/webgl2-renderer.ts`, `src/parser/am-xml-parser.ts`):
  - Memperbaiki perhitungan matriks `computeLayerMatrix` dan `computeWorldTransform` agar menyertakan rotasi dan skala parent secara rekursif serta menggeser titik pusat rotasi/skala berdasarkan `layer.origin` (pivot).
  - Menambahkan dukungan parser XML untuk semua jenis bentuk (`s=".circle"`, `.roundrect`, `.star`, `.polygon`, `.triangle`, `.diamond`, `.line`, `.arrow`), `<border>`/`<stroke>`, `inTime`, `blending="mask"`/`"exclude"`, dan keyframe animasi `<size>`, `<pivot>`, serta `<fillColor>`.
- **Fitur V5.238 (Preset Efek JSON, Text Animator, 2D Motion Tracker)** (`src/engine/text-renderer.ts`, `src/ui/inspector-panel.ts`):
  - **Text Animator V5.238**: Animasi per-huruf (`char`), per-kata (`word`), dan per-baris (`line`) dengan selector rentang (`start`, `end`, `offset`, `shape`) dan 5 preset siap pakai (`cascade-fade`, `typewriter`, `wave`, `bounce-in`, `glitch-char`).
  - **2D Motion Tracker → Layer Null**: Analisis gerakan luminans lintas frame menggunakan kanvas sampel 96×96 untuk menghasilkan layer `Null (Motion Track)` ber-keyframe posisi otomatis.
  - **Impor/Ekspor Preset Efek JSON (`.amfx.json`)**: Menyimpan dan memuat tumpukan efek beserta parameter & keyframe di tab Efek Inspector.

## 2. Cabang 2 — UI/UX & Tata Letak Editor (`AM-PC` Benchmark)
- **Dual Editor Layout Engine (`F8` & Tombol Topbar `#btnLayoutMode`)** (`src/ui/studio-ui.ts`, `src/ui/styles.css`):
  - **Mode Studio Widescreen** (default): Preview kanvas di atas, Timeline di bawah, Inspector di kanan.
  - **Mode Asli Side-by-Side** (`.side-by-side-layout`): Preview kanvas di kiri, Timeline dan Inspector berdampingan di kanan (persis tata letak Open-Motion asli), disimpan di `localStorage` (`am_layout_mode`) dengan auto-fit kanvas.
- **Hitbox Seleksi Cyan Otentik (`#00e5ff`) & Sinkronisasi Geometri** (`src/ui/canvas-stage.ts`, `src/engine/webgl2-renderer.ts`):
  - Menambahkan `renderer.getLayerWorldBox(layer, time)` yang dievaluasi langsung dari transform dunia + pivot WebGL2Renderer sehingga kotak seleksi selalu tepat membungkus teks, bentuk, maupun media (termasuk layer seukuran kanvas penuh, sesuai Fakta F-14 AM-PC).
- **Peningkatan UX Timeline Desktop** (`src/ui/timeline-panel.ts`):
  - `Shift + Wheel` untuk geser horizontal, `Wheel` di penggaris waktu (ruler) untuk zoom durasi.
  - Menonaktifkan timer tekan-lama (420ms) untuk klik mouse biasa agar tidak masuk mode multi-select secara tidak sengaja (sesuai Fakta F-16 AM-PC); multi-select mouse diaktifkan dengan `Ctrl+Click` atau `Shift+Click`.
  - Mempertahankan pilihan multi-select saat menggeser playhead atau area kosong timeline.
- **Identitas Visual Khas AM-PC** (`src/ui/styles.css`, `src/ui/overlays.ts`):
  - Tombol `+` Tambah Layer (`.am-add-layer-fab`) menggunakan latar `#18221d`, border neon hijau mint `2px solid #00e676`, efek glow, dan berputar 45° saat menu terbuka (`.is-open`).
  - Efek Android Touch Ripple + Micro-Press dan Container Transform Modal Morphing.

## 3. Cabang 3 — Alur Kerja, Home Screen, & Produktivitas
- **Panel Multi-Select di Inspector Kanan + Batch Media Relinker** (`src/ui/inspector-panel.ts`, `src/ui/studio-ui.ts`):
  - Menampilkan kartu Multi-Select di `#amPanel` saat beberapa layer dipilih, lengkap dengan tombol **Kelompokkan**, **Grup Masking**, **Hapus Terpilih**, dan kartu **Tautkan Ulang Media** dengan tombol **"Ganti Semua Sekaligus (N Media)"** serta ganti individual per layer.
  - Menyimpan media yang di-relink secara persisten menggunakan protokol `ammedia://` (`persistMediaFile`) agar tetap tersimpan saat aplikasi ditutup dan dibuka kembali.
- **Thumbnail Proyek Otomatis & Pengurutan Home Screen** (`src/ui/home-screen.ts`, `src/ui/studio-ui.ts`):
  - Menangkap frame nyata WebGL pada `t = min(1.0, duration * 0.5)` (`captureThumbnailDataUrl`) ke `project.thumb` (WebP) dan menampilkannya pada kartu proyek di Home Screen.
  - Menambahkan dropdown pengurutan proyek (**Terbaru**, **Terlama**, **Nama A–Z**).
- **Impor Terpadu (`.xml`, `.amproj`, `.zip`) & Split View 50:50 AM Finder / AM Hub** (`src/ui/am-zip.ts`, `src/ui/home-screen.ts`, `src/ui/studio-ui.ts`):
  - Menambahkan `AMZipPackage.unpack(arrayBuffer)` untuk mengekstrak paket proyek `.zip` lokal beserta media di dalamnya secara langsung.
  - Menambahkan mode Split View 50:50 di Home Screen untuk membuka Daftar Proyek berdampingan dengan AM Finder / AM Hub.
- **Modal Pintasan Keyboard (`?` / `F1`) Bebas Blur & Kustomisasi Tombol** (`src/ui/overlays.ts`, `src/ui/styles.css`, `src/ui/studio-ui.ts`):
  - Memisahkan z-index `.am-shortcuts-backdrop` (`z-index: 1`) dan `.am-shortcuts-card` (`z-index: 10; filter: none; backdrop-filter: none`) agar teks pintasan 100% tajam tanpa tertutup blur backdrop.
  - Mendukung pemetaan ulang (remap) tombol pintasan secara interaktif (tersimpan di `localStorage`) serta navigasi frame presisi (`ArrowLeft`/`ArrowRight` ±1 frame, `Shift+Arrow` ±10 frame, `Home`/`End`).

## 4. Cabang 4 — Performa Playback, Ekspor Native FFmpeg, & Portable Build
- **Offline Audio Mixer (`OfflineAudioContext`) & Sinkronisasi Seek Video** (`src/engine/media-manager.ts`, `src/ui/export-sheet.ts`):
  - Menambahkan `mediaManager.mixProjectAudioWav(project)` menggunakan `OfflineAudioContext` untuk merender seluruh layer audio (`timeStart`, `timeEnd`, `inTime`) menjadi berkas PCM 16-bit WAV dalam `<100ms` dan menggabungkannya ke dalam hasil ekspor MP4/WebM/MOV.
  - Menambahkan `mediaManager.seekAllAndWait(time, layers)` di loop ekspor agar setiap frame video menunggu event `seeked` secara deterministik sebelum di-capture ke FFmpeg.
- **Resolusi FFmpeg Tangguh & Guard Resolusi Genap** (`electron/main.js`, `src/ui/export-sheet.ts`):
  - Memperkuat `resolveFfmpeg()` (`process.env.AM_FFMPEG_PATH` → `ffmpeg` di PATH → `ffmpeg-static`) dan menambahkan filter `-vf scale=trunc(iw/2)*2:trunc(ih/2)*2` untuk encoder H.264 (`libx264`).
  - Mengubah format ekspor default ke **MP4 (H.264)**.

---

## Bukti Verifikasi
1. **TypeScript Typecheck (`npx tsc --noEmit`)**: Lulus **0 error**.
2. **Verifikasi Shader (`npm run verify:shaders`)**: **286 / 286 program pass (100% pass-rate)**.
3. **Verifikasi Script Effect (`npm run verify:scripts`)**: **38 / 38 efek script pass** + tes render end-to-end WebGL2Renderer lulus.
4. **Verifikasi UI & Render (`npm run verify:ui`)**: Seluruh layar (Home, AM Finder, AM Link, Setup, Editor, Effects) ter-render bersih tanpa error.
5. **Build Aplikasi Portable (`npm run build:portable`)**: Berhasil membangun `d:\project afgan dkk\AM-Native-Desktop\release\Alight-Motion-Native-win-x64\Alight Motion Native.exe` beserta aset dan ikon efek resmi (`dist/icons/effects`).
