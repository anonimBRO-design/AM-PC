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

5. **Rebranding Splash Screen Alight Motion PC (Frame-0)**:
   - Masalah: Upstream V5.285 menambahkan splash screen `#appSplashScreen` dengan logo Open Motion dan background ungu `#1e2239`.
   - Solusi: Diinjeksi di `electron/preload.js` dan `css/desktop.css` tanpa mengubah `index.html`.
     - Background: Gelap modern Alight Motion PC `#0c0f14`.
     - Logo: Ikon resmi Alight Motion squircle (`icons/test_prime_am.png`) ukuran 130×130px, border-radius 30px, shadow halus, dan proteksi anti-flash `am-splash-ready`.
     - Teks: Judul "Alight Motion PC" (24px Inter bold) + Subtitle "Motion Graphics & Visual Effects" (12px neon mint `#00e676`).
     - Spinner: Indikator iOS spinner dengan bilah hijau mint neon `#00e676`.
   - Verifikasi: Berhasil diuji coba via `scratch/test_splash_screen.js` dan screenshot `scratch/screenshot_splash_screen.png`.

6. **Perbaikan Warna Putih Kartu Proyek & Tombol Header Beranda**:
   - Masalah: Upstream V5.285 menambahkan `.simpleHome .projectCard { background: #ffffff !important; }` dan `.simpleHome .rightBtn { background: #ffffff !important; }` di baris 6935–7125 `index.html`. Akibatnya seluruh kartu proyek dan tombol IMPOR & AM LINK menjadi putih terang di atas latar belakang gelap.
   - Solusi: Di-override di `css/desktop.css` dan `css/desktop-studio.css` dengan selektor ber-spesifisitas tinggi (`body.is-electron .simpleHome .projectCard`, `.simpleHome .homeTopActions .rightBtn`, dll.):
     - Background kartu: Deep charcoal navy `#141822`.
     - Border kartu: `#232b3a` (halus 1px).
     - Hover kartu: `#1a202d` dengan border neon hijau mint `#00e676`.
     - Judul proyek: `#ffffff` (putih bersih) dan meta info: `#8c98ad`.
     - Tombol IMPOR & AM LINK: Gelap slate `#181d28`, border `#283042`, teks `#d1d8e6`, hover glow mint.
   - Verifikasi: Diuji di Electron runtime (`scratch/test_cards_color.js`), seluruh computed background kartu terbukti `#141822` (`rgb(20, 24, 34)`), teks `#ffffff`, tombol `#181d28` (0% putih), dan disinkronkan langsung ke `release/`.

7. **Implementasi Tempel Gaya Selektif (1:1 Alight Motion) & Penggantian Media Jedag-Jedug Massal**:
   - Latar Belakang & Wawasan Komunitas: Di Alight Motion mobile, editor mengganti foto/video/media secara massal (untuk preset jedag-jedug) melalui tombol `>` pada menu "Tempel Gaya" dengan hanya mencentang opsi "Warna & Isi".
   - Di Open-Motion Upstream:
     - Menu "Aksi Layer" hanya punya tombol datar "Tempel Gaya" tanpa tombol sub-opsi `>`.
     - Saat mode multi-select aktif, `canPasteStyle` upstream bernilai false sehingga tombol "Tempel Gaya" terkunci (disabled) di popover.
   - Solusi yang Diimplementasikan (di `electron/desktop-engine.js` & `css/desktop.css`):
     - Tombol Chevron `>` (`#amPasteChevronBtn`): Diinjeksi ke baris "Tempel Gaya" di popover `#layerActionsPopup`. Klik teks baris menjalankan tempel cepat, klik `>` membuka modal opsi selektif.
     - Multi-Select Support: Menambal `ui.layerActionsState` agar `canPasteStyle` tetap aktif saat beberapa layer dipilih.
     - Dialog Opsi Selektif (`#amPasteStyleModal`):
       - Grid 2×3 berisi 6 kartu atribut 1:1 Alight Motion:
         1. **Warna & Isi** (Ganti foto, video, assetId, dataUrl, texture WebGL, dan warna solid/gradien).
         2. **Efek** (Effect stack & effects dictionary).
         3. **Campuran & Opasitas** (Opacity & blend mode).
         4. **Transformasi** (Posisi, skala, rotasi, pivot, dan keyframe transform).
         5. **Batas & Bayangan** (Stroke & shadow).
         6. **Klip** (In/out time & speed).
       - Semua opsi default aktif tercentang (1:1 AM mobile), dilengkapi bilah "Pilih Semua" & "Hapus Semua".
       - Tombol aksi primer dinamis: "TEMPEL KE N LAYER".
     - Engine Tempel Selektif: Mentransfer hanya properti yang dipilih, mengisolasi properti yang tidak dicentang (misal rotasi dan opasitas target tetap utuh saat hanya menempel Warna & Isi), serta meregenerasi runtime WebGL texture cache.
   - Verifikasi Uji Coba:
     - Diuji dengan suite headless Electron `scratch/test_selective_paste_style.js`.
     - Hasil: Layer target sukses berganti menjadi tipe `image` dengan `dataUrl` baru dan warna `#00e676`, sementara rotasi tetap 0° dan opasitas tetap 1.0 (0 error console).
     - Screenshot tersimpan di `scratch/screenshot_paste_style_modal.png` dan `scratch/screenshot_paste_style_result.png`.
     - Perubahan disinkronkan ke folder `release/Alight-Motion-PC-win-x64/resources/app/`.


