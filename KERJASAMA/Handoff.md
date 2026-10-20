# Handoff — State Terkini

> **File ini DITIMPA, bukan ditambahi.** Selalu cerminkan kondisi terkini.
> Terakhir diperbarui: 20 Okt 2026 · oleh: Antigravity (Sinkronisasi Upstream Open-Motion V5.285 di AM-PC)

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
| **Antigravity** | ✅ Selesai Tahap 1, 2 & Fix Storage | WebGL2 Engine, Quad Transform, XML Parser Overhaul, 95.5% Shader Pass, Zero Emojis, Fix Re-seeding Proyek Kosong (Jebakan #21), Uninstalasi Bersih Cursor |
| **Hermes** | ✅ Poin 1–3 selesai · ⏳ Poin 4 (remote) | Ikon KnownMap, Media Loader, QA Suite, Git Remote |

---

### Update Terbaru (20 Okt 2026) — Sinkronisasi Upstream Open-Motion V5.285 (AM-PC)
- **Pembaruan Upstream V5.285 (Hada45/Open-Motion)**:
  - Hash blob `index.html`: `4df41ae4374054cd5177170c6110918e4f8b59e9` (100% identik upstream).
  - Sinkronisasi bersih `index.html` dan `CHANGELOG.md` via `git checkout upstream/main -- index.html CHANGELOG.md`.
  - Integrasi resmi fitur-fitur baru:
    1. **V5.283**: PR #33 (remap keyboard shortcut kita) di-merge resmi upstream; dedicated group timelines, breadcrumbs, ordinary/mask/exclude groups, border/shadow controls, audio spectrum.
    2. **V5.284**: Drawer Add Object (`+`) 1:1 Alight Motion v5.0.273 (5 tab: Shapes, Elements, Media, Audio, Templates + quick-add rail kanan), bentuk vektor parametrik baru (plus, heart, pie, crescent), ekspor hingga 240 FPS.
    3. **V5.285**: Animasi tutup drawer halus (`.drawerClosing`), penekanan modal eksperimen ("Jangan tampilkan lagi" / `localStorage`), high-contrast dark theme empty state.
- **Pengujian Kompatibilitas Multi-Suite Lolos 100%**:
  - Test 1 (`scratch/check_finder.js`): Tombol `AMFINDER` dan `AMHUB` terpasang rapi di top bar frame 0.
  - Test 2 (`scratch/verify_shortcuts.js`): Modal shortcut #amShortcutsModal dark theme #121820 terpasang sempurna.
  - Test 3 (`scratch/test_ffmpeg_export.js`): Ekspor native FFmpeg MP4 30 frame valid via ffprobe (51.391 bytes).
  - Test 4 (`scratch/verify_v5285_ui.js`): Editor widescreen studio, Add Object drawer 5 tab, 0 console error.
- **Build Portable Sukses**:
  - `node scripts/build-portable.js` mengompilasi `release/Alight-Motion-PC-win-x64/Alight Motion PC.exe` versi V5.285.

### Update Sebelumnya (16 Okt 2026) — Paritas Penuh AM-Native-Desktop terhadap Standar Emas AM-PC V5.238
- **Cabang 1 (Engine Render WebGL2 & Paritas Visual)**:
  - Backdrop Capture Adjustment Layer (`magnifybg`, `copybg`, `lift` dengan `fill<=0.001`, `displacemap3` + masking bentuk layer via `maskProgram`).
  - Compositor GLSL ES 3.00 dengan **24 Blend Mode** + **4 Track Matte Mode** (`alpha`, `alpha-inverted`, `luma`, `luma-inverted`, serta `blending="mask"`/`"exclude"`).
  - Hierarki rotasi/skala parent rekursif & pivot `layer.origin` di `computeWorldTransform` + `computeLayerMatrix`, serta perluasan parser XML untuk semua jenis bentuk, `<border>`, `inTime`, dan keyframe `<size>`/`<pivot>`/`<fillColor>`.
  - Fitur V5.238: **Text Animator** (per-huruf/kata/baris + 5 preset), **2D Motion Tracker → Null layer**, dan **Impor/Ekspor Preset Efek JSON (`.amfx.json`)**.
- **Cabang 2 (UI/UX & Tata Letak Editor)**:
  - **Dual Editor Layout Engine (`F8` & `#btnLayoutMode`)**: Mode Studio Widescreen vs Mode Asli Side-by-Side (`.side-by-side-layout`).
  - **Hitbox Seleksi Cyan Otentik (`#00e5ff`)** yang disinkronkan langsung dengan `WebGL2Renderer.getLayerWorldBox(layer, time)`.
  - **UX Timeline Desktop**: `Shift+Wheel` pan horizontal, `Wheel` di penggaris waktu untuk zoom, `Ctrl/Shift+Click` multi-select mouse (tanpa false-positive long-press 420ms), serta proteksi seleksi multi-layer saat menggeser timeline kosong.
  - **Identitas Visual AM-PC**: Tombol `+` Tambah Layer Neon Mint (`.am-add-layer-fab`: `#18221d`, border `2px solid #00e676`, glow, rotasi 45° saat `.is-open`), Android Touch Ripple + Micro-Press, dan Container Transform Modal Morphing.
- **Cabang 3 (Alur Kerja, Home Screen, & Produktivitas)**:
  - **Panel Multi-Select di Inspector Kanan (`#amPanel`)** dengan tombol Kelompokkan, Grup Masking, Hapus, dan kartu **Tautkan Ulang Media ("Ganti Semua Sekaligus (N Media)")** yang menyimpan media secara persisten via `ammedia://`.
  - **Auto-Capture Thumbnail Proyek WebGL (`project.thumb` WebP)** di Home Screen + dropdown pengurutan (**Terbaru**, **Terlama**, **Nama A–Z**).
  - **Impor Terpadu (`.xml`, `.amproj`, `.zip`)** + **Split View 50:50** antara Daftar Proyek dan AM Finder / AM Hub.
  - **Modal Pintasan Keyboard (`?` / `F1`) Bebas Blur** (`z-index: 10` di atas backdrop `z-index: 1`) + pemetaan ulang tombol interaktif (`localStorage`) + navigasi frame presisi (`ArrowLeft`/`ArrowRight` ±1f, `Shift+Arrow` ±10f, `Home`/`End`).
- **Cabang 4 (Performa Playback, Ekspor Native FFmpeg, & Portable Build)**:
  - **Offline Audio Mixer (`OfflineAudioContext`)** merender seluruh track audio ke WAV PCM 16-bit (`<100ms`) dan menggabungkannya dengan video ekspor.
  - **Sinkronisasi Frame Video Deterministik (`seekAllAndWait`)** + resolusi FFmpeg tangguh (`AM_FFMPEG_PATH` → `ffmpeg` → `ffmpeg-static`) + guard dimensi genap H.264 (`-vf scale=trunc(iw/2)*2:trunc(ih/2)*2`) + default format **MP4 (H.264)**.
  - **Verifikasi & Build Portable**: `tsc --noEmit` (0 error), `verify:shaders` (286/286 = 100%), `verify:scripts` (38/38 = 100%), `verify:ui` (lulus), dan `npm run build:portable` menghasilkan `release/Alight-Motion-Native-win-x64/Alight Motion Native.exe`.

### Update Sebelumnya (11 Okt 2026 23:25) — Sinkronisasi Upstream Open-Motion V5.238
- **Pembaruan Inti Upstream V5.238 (Hada45/Open-Motion)**:
  - Fitur Motion Tracking 2D (Point, Two Points, Planar, Corner Pin, Stabilizer) dan Camera 3D Tracking dengan keyframe serta pembuatan Null layer.
  - Fitur Text Animator: Targeting karakter/kata/baris/seluruh teks, selector range, kontrol 3D, dan 130 preset bawaan.
  - Paket efek dan preset kustom yang dapat diimpor/diekspor format JSON.
  - Sinkronisasi bersih selektif hanya untuk berkas upstream (index.html dan CHANGELOG.md). Hash blob index.html: 5c602db41fe5cde3ba39d9363f1e3a1ece9a14e5 (100% identik upstream).
- **Pengujian Kompatibilitas Multi-Suite Lolos 100%**:
  - Test 1: Tombol header editor, modal shortcut #amShortcutsModal dark theme #121820, 16 baris shortcut terpasang sempurna.
  - Test 2: Ekspor native FFmpeg MP4 30 frame valid via ffprobe (51.391 bytes).
  - Test 3: Pemuatan proyek riil Alight Motion CelzPredet (38 layer, 1077 keyframe), render panggung WebGL2 100% akurat, dan ekspor 15 frame ke MP4 native (466.450 bytes).
- **Build Portable Sukses**:
  - node scripts/build-portable.js mengompilasi release/Alight-Motion-PC-win-x64/Alight Motion PC.exe versi V5.238.

### Update Sebelumnya (11 Okt 2026 22:10) — AM-PC Editor
- **Perbaikan Lapisan Blur pada Modal Pintasan Keyboard (#amShortcutsModal)**:
  - Mengatasi masalah kartu modal dan teks buram/blur saat menekan tombol tanda tanya (`?`) atau `F1`.
  - Akar masalah: elemen `.amShortcutsBackdrop` (`position: absolute; inset: 0; backdrop-filter: blur(10px)`) terlukis di atas kartu `.amShortcutsCard` karena kartu sebelumnya tidak memiliki `position: relative` dan `z-index`. Serta kontainer sempat mewarisi kelas `.amWebModal` yang menjalankan animasi backdrop filter pada kontainer induk.
  - Perbaikan tuntas:
    - Memberikan `position: relative !important; z-index: 10 !important; filter: none !important; backdrop-filter: none !important;` pada `.amShortcutsCard`.
    - Memberikan `z-index: 1 !important;` pada `#amShortcutsBackdrop` dan `.amWebModalBackdrop` sehingga backdrop selalu berada di bawah kartu.
    - Mengisolasi kelas kontainer modal pintasan menjadi independen dari `.amWebModal`.
    - Menambahkan `e.stopPropagation()` pada klik kartu agar interaksi di dalam kartu tidak memicu penutupan backdrop.
  - Verifikasi: Berhasil diverifikasi secara visual melalui tangkapan layar Electron (`test_shortcuts_modal.png`), computed styles kartu terbukti `opacity: 1`, `z-index: 10`, `filter: none`, dan seluruh teks pintasan tajam 100%. Berkas disinkronkan ke direktori rilis.
- **Distribusi Rilis & Sinkronisasi Remote GitHub (Commit 715693b)**:
  - Berhasil melakukan `git push origin main` untuk menyinkronkan seluruh 43 commit terbaru ke repositori GitHub resmi `anonimBRO-design/AM-PC`.
  - Berhasil mengompilasi dan mengemas ulang aplikasi mandiri portable dengan `node scripts/build-portable.js` ke folder `release/Alight-Motion-PC-win-x64/` lengkap dengan ikon resmi dan metadata aplikasi tersemat di `Alight Motion PC.exe`.
- **Fitur Cheatsheet Shortcut Keyboard & Navigasi Frame Presisi (Commit 715693b)**:
  - Tombol Bantuan Pintasan: Menambahkan tombol ikon `?` (`#amShortcutsHelpBtn`) pada bilah atas editor di samping tombol switcher tata letak.
  - Dialog Modal Pintasan Keyboard: Modal dark theme modern (`#amShortcutsModal`) yang dapat dibuka via klik tombol `?` atau shortcut keyboard `F1` / `?`. Menampilkan 16 pintasan terorganisir rapi dengan komponen `<kbd>` chiclet untuk kategori Pemutaran, Garis Waktu, Tata Letak, Mouse, dan Manajemen Dokumen.
  - Navigasi Frame Presisi:
    - `ArrowLeft` / `ArrowRight`: Melangkah mundur / maju 1 frame persis sesuai FPS proyek.
    - `Shift + ArrowLeft` / `Shift + ArrowRight`: Melompat cepat 10 frame (atau 1/3 detik).
    - `Home` / `End`: Melompat langsung ke frame awal (0) atau akhir proyek.
    - `Escape`: Menutup modal pintasan secara instan.
- **Rebranding & Tema Gelap Modal Diagnostik Alight Motion PC (Commit 9065058)**:
  - Judul diubah dari "Diagnostik Open Motion" menjadi "Diagnostik Alight Motion PC" melalui pseudo-element CSS ::before di frame-0 serta DOM text walker otomatis.
  - Seluruh kemunculan teks "Open Motion" di dalam modal dan drawer Project & Environment diselaraskan menjadi "Alight Motion".
  - Tema modal dirombak total dari putih terang menjadi tema gelap modern Alight Motion PC:
    - Backdrop semi-transparan rgba(8, 12, 18, 0.85) dengan efek blur 10px.
    - Kontainer modal dark surface #121820 dengan border slate halus #233042 dan sudut membulat 16px.
    - Kartu diagnostik (#omsDiagAudioV207, #omsDiagPreviewV205, #omsDiagMemoryV198, Master, Kategori) berlatar gelap #161e28 dengan judul hijau neon var(--accent, #00e676).
    - Tombol aksi primer (REKAM AUDIO + PREVIEW, UJI PREVIEW, UJI RAM, SALIN AKTIF) menggunakan latar #18221d dengan border neon hijau mint dan efek glow.
    - Tombol aksi sekunder menggunakan tema dark slate #202b3a dengan teks #e2e8f0.
    - Tabel ringkasan metrik memori diubah menjadi dark table #121820 dengan pembatas #1c2635.
  - Berkas disinkronkan ke direktori rilis dan diverifikasi tanpa sisa kata Open Motion di modal.
- **Penyelarasan Tampilan Tombol Plus Mode Studio dengan Mode Asli (Commit a5a9ecc)**:
  - Tombol tambah layer (+) pada Mode Studio disamakan 100% dengan Mode Asli:
    - Lingkaran background gelap charcoal (#18221d).
    - Border neon hijau mint 2px (solid var(--accent, #00e676)).
    - Simbol plus neon mint dengan glow halus (box-shadow: 0 4px 18px rgba(0, 230, 118, 0.35)).
    - Status open saat drawer terbuka bertransformasi rotasi 45 derajat dengan warna navy gelap #243047.
  - Berkas css/desktop-studio.css disinkronkan ke direktori rilis dan diverifikasi visual dengan Electron headless (test_plus_studio.png vs test_plus_original.png).
- **Eliminasi Flash Branding & Pop-in Tombol Top Bar Saat Refresh (Commit b0fa0fd)**:
  - Masalah teratasi: Saat reload halaman (Ctrl+R), Chromium sempat merender teks "Open Motion", logo lama, dan tombol INSTAL selama 50-200ms sebelum DOMContentLoaded berjalan, serta tombol AMFINDER & AMHUB terlambat muncul (pop-in).
  - Solusi Frame-0:
    1. Teks `.homeWordmark b`: Diatur `font-size: 0 !important; visibility: hidden !important;` dengan pseudo-element `::before { content: 'Alight Motion PC' !important; }` sehingga judul Alight Motion PC tampil instan di frame ke-0 tanpa menunggu JavaScript selesai mengeksekusi 34.000 baris script upstream.
    2. Logo `.homeMark`: Elemen `img` lama disembunyikan permanen dengan `display: none !important;`, digantikan logo resmi `icons/test_prime_am.png` (serta base64 data URI pada early CSS) sehingga tidak ada delay I/O berkas.
    3. Tombol AMFINDER & AMHUB: Dipasang melalui streaming `MutationObserver` dini di `preload.js` saat elemen `.homeTopActions` pertama kali masuk ke DOM tree (pada baris 4172 HTML), mendahului ribuan baris script upstream dan langsung dirender bersamaan pada first paint.
    4. Tombol INSTAL PWA (`#homeInstallBtn`), tombol info lama (`#homeAMNoticeBtn`), dan modal notice (`#experimentalNotice`) disembunyikan permanen secara instan sejak awal.
- **Sinkronisasi Upstream Resmi (PR #32 anonimBRO-design di-merge)**:
  - PR #32 (eat/project-thumbnails) resmi di-merge oleh Hada45 ke upstream/main (commit a12c5aa).
  - Berkas index.html lokal disinkronkan ke versi upstream terbaru (hash: e33d60e92a0a275af1c286df3aed262ab84e77f).
  - Fitur resmi captureProjectThumbnail dan render kartu proyek ber-thumbnail aktif di aplikasi lokal dan rilis.
  - Fakta F-01 dan AGENTS.md diperbarui dengan hash terverifikasi baru.
- **Penyempurnaan Widescreen Mode Studio & Resizer Tinggi Timeline (Commit b372cea & 6f7d468)**:
  - Preview Widescreen: Area preview memenuhi 100% lebar layar di Mode Studio saat drawer tertutup, kanvas berada tepat di tengah, dan ruang kosong hitam 664px telah hilang sepenuhnya.
  - Auto-Dock Inspector: Saat drawer dibuka, dock kanan 400px muncul secara dinamis dan area preview menyesuaikan secara mulus.
  - Resizer Tinggi Timeline Vertikal: Tersedia handle geser #editorSplitHandle untuk menarik batas tinggi timeline secara vertikal (minimal 180px, tersimpan di localStorage).
  - Auto-Fit Zoom Kanvas: Otomatis memanggil Fit to Viewport saat berganti mode atau mengubah ukuran tata letak agar kanvas selalu pas dan tidak terpotong.
  - Proteksi Grid: Mencegat inline style upstream applySplit agar tidak merusak tata letak CSS Grid Studio.
- **Penyempurnaan Widescreen Mode Studio & Resizer Tinggi Timeline (Commit b372cea)**:
  - Preview Widescreen: Area preview memenuhi 100% lebar layar di Mode Studio saat drawer tertutup, kanvas berada tepat di tengah, dan ruang kosong hitam 664px telah hilang sepenuhnya.
  - Auto-Dock Inspector: Saat drawer dibuka, dock kanan 400px muncul secara dinamis dan area preview menyesuaikan secara mulus.
  - Resizer Tinggi Timeline Vertikal: Tersedia handle geser #amTimelineResizeBar dan #editorSplitHandle untuk menarik batas tinggi timeline secara vertikal (minimal 180px, tersimpan di localStorage).
  - Auto-Fit Zoom Kanvas: Otomatis memanggil Fit to Viewport saat berganti mode atau mengubah ukuran tata letak agar kanvas selalu pas dan tidak terpotong.
  - Proteksi Grid: Mencegat inline style upstream applySplit agar tidak merusak tata letak CSS Grid Studio.
- **Dual Editor Layout Engine (Mode Studio vs Mode Asli) — FIX SELESAI**:
  - Tersedia 2 mode tata letak editor yang bisa di-toggle secara instan:
    1. **Mode Studio AM-PC**: Preview di atas, Timeline di bawah 280px, Inspector docked di kanan.
    2. **Mode Asli Open-Motion**: Preview di kiri, Timeline di kanan (berdampingan / side-by-side) persis sesuai sumber asli upstream `index.html` dan web https://hada45.github.io/Open-Motion/.
  - **Fix Bug Switcher & Kanvas Pinggir (Sesi 8)**:
    - Menghapus `transition: grid-template-columns` di `desktop-studio.css` yang sebelumnya membekukan kalkulasi kolom Blink/Chromium pada `776px 647px`.
    - Membersihkan inline styles dan rasio polusi `sessionStorage` (`omsDesktopCanvasSplitRatioV441A`) sehingga Mode Asli kembali 100% ke proporsi Open-Motion asli dan kanvas berada tepat di tengah tanpa void hitam.
    - Menambahkan `style.media = 'not all'` / `style.media = 'all'` dan caching `dataset.mode` pada tombol switcher.
  - Dilengkapi tombol switcher visual `#amLayoutSwitchBtn` di bilah atas `.editorTop` dan shortcut **`F8`** untuk beralih mode kapan saja tanpa reload.
- **Fix Pembatalan Mode Multi-Select saat Menggeser/Mengklik Timeline**:
  - Mengatasi issue user keluar dari mode multi-select ketika menggeser timeline kiri-kanan dengan klik kiri mouse.
  - Mem-patch `TimelineController.prototype.clearTimelineLayerSelection` agar membatalkan penghapusan multi-selection saat `ui.layerMultiSelectMode` aktif.
  - Mem-patch `TimelineController.prototype.isEmptyTimelineTarget` agar area kosong `.trackLane` diizinkan untuk pan horizontal timeline saat mode multi-select aktif.
- **Navigasi Roda Mouse Timeline (Commit `cc135f0`)**:
  - Roda mouse biasa: scroll vertikal native (atas-bawah) untuk melihat daftar layer/track.
  - `Shift + Wheel`: pan horizontal timeline (kiri-kanan waktu) dengan pergerakan 1x mulus.
  - `Ctrl + Wheel`: zoom timeline (diteruskan ke engine zoom native `timeline.onZoomWheel`).
- **Optimasi Playback & DOM AM-PC (Commit `f1c0a10`, `5010357`, `88658c7`)**:
  - Throttled MutationObserver di `preload.js` (250ms) untuk menghentikan 7 pemanggilan DOM traversal per-frame saat playback.
  - `backgroundThrottling: false` di `main.js`.
  - Scoped query `.effectCard` di `desktop-engine.js`.
- **Tipografi & Font UI Home (Commit `740220f`)**:
  - Font Plus Jakarta Sans + perbesaran kicker (11px), judul (26px), FAB proyek baru (13px), dropdown urutkan (13px), dan tombol bahasa (12px).

## Kondisi proyek

**AM-PC** — fork dari [Hada45/Open-Motion](https://github.com/Hada45/Open-Motion),
dibungkus jadi aplikasi desktop Windows.

| Aspek | State |
|---|---|
| `index.html` | ✅ Sama persis dengan upstream (lihat [[Fakta]] F-01) |
| Versi | Open Motion **V5.285** |
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
