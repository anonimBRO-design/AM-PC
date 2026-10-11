# Log 2026-10-11 — Antigravity

## Ringkasan

1. **Perbaikan Dokumentasi AM-PC**:
   - Memperbaiki nomor duplikat `F-14` di `KERJASAMA/Fakta.md` dan menata ulang urutan F-14 sampai F-19.
   - Memperbaiki baris 81 di `AGENTS.md` perihal status `css/` yang sudah aktif dimuat via Electron `insertCSS`.
   - Di-commit ke `main` di repo `AM-PC`. Hash `index.html` diverifikasi 100% identik dengan upstream.

2. **Inisialisasi & Implementasi Repo Standalone AM-Native-Desktop**:
   - Berdasarkan hasil alignment `/grill-me` bersama user untuk membuat porting Alight Motion dari nol (*ground-up* dari APK asli tanpa batasan Open Motion monolitik), diinisialisasi repository mandiri di:
     `d:\project afgan dkk\AM-Native-Desktop`
   - **Teknologi**: TypeScript + Vite + Electron + WebGL2 (GLSL ES 3.00) + Hybrid Dual-Mode UI.
   - **Aset Resmi Termuat**:
     - 328 file definisi efek XML Alight Motion APK di `assets/effects/`.
     - 368 file thumbnail WebP resmi Alight Motion APK di `assets/icons/`.
   - **Engine Multi-Pass WebGL2 Selesai**:
     - Parser metadata dan shader 328 efek (`scripts/bundle-effects.js` menghasilkan `definitions.json`).
     - Engine multi-pass Framebuffer (FBO) dengan ping-pong render target untuk efek beruntun per layer.
     - Shader pipeline GLSL ES 3.00 dengan injeksi otomatis seragam APK (`acPass`, `acScreenNorm`, `acPreviewSize`, `acLayerSize`, `acLayerNorm`, `acLayerToScreen`, struct `TextureData`, uniform parameter dinamis).
     - Solver kurva Cubic Bezier presisi Alight Motion dan interpolator keyframe (`src/engine/animator.ts`).
   - **Hybrid Dual-Mode UI Selesai**:
     - **Mode 1: Studio Pro (Widescreen)**: Header, browser efek dengan icon WebP resmi dan filter kategori/pencarian, inspector layer & stack efek dinamis, dan multi-track timeline profesional (playhead scrubber, ruler, frame stepping, timecode indicator).
     - **Mode 2: Compact Mobile View**: Beralih dalam 1 klik ke tampilan ponsel vertikal yang bersih.
   - **Verifikasi Smoke Test**:
     - Divalidasi via headless Electron test script dengan 0 error konsol dan 0 feedback loop WebGL.
     - Dihasilkan visual screenshot pembuktian di `dist/smoke-screenshot.png` dan `dist/smoke-mobile-screenshot.png`.

3. **Perbaikan Kanvas Solid Salmon/Pink, Parser XML & Shader Pipeline (Sesi 2)**:
   - **Root Cause Kanvas Solid Pink**:
     1. `parseHexColor()` membaca format 8-digit hex `#AARRGGBB` sebagai RGBA sehingga `#ff000000` (hitam opaque) dibaca sebagai merah (R=1.0).
     2. `renderBaseLayerContent()` memanggil `gl.clearColor(...)` dan `gl.clear(gl.COLOR_BUFFER_BIT)` ke seluruh framebuffer FBO untuk setiap layer, menimpa seluruh layar dengan warna solid tanpa batas quad transform.
   - **Solusi Transform Quad & Media Rendering**:
     - Menambahkan program shader `layerProgram` di `src/engine/shader-pipeline.ts` yang mendukung `uMatrix` (mat4 2D orthographic + transform), `uUseTexture` (sampler2D), dan `uColor` (vec4).
     - Mengganti `renderBaseLayerContent()` dengan kalkulasi matriks model-view-proyeksi layer (`position`, `scale`, `rotation`, `size`) dan penggambaran quad berbatas presisi via `shaderPipeline.drawQuad()`.
     - Mengintegrasikan `MediaManager` ke dalam `WebGL2Renderer` untuk auto-registrasi layer media dan binding texture ke GL.
   - **Overhaul XML Parser (`src/parser/am-xml-parser.ts`)**:
     - Membaca metadata `<media>` lengkap (`uri`, `filename`, `type`, `width`, `height`).
     - Mendukung parsing rekursif `<embedScene>` dan `<scene>` bersarang (terbukti membaca 50 track pada project nyata Alight Motion).
     - Membaca timing milidetik (`startTime`, `endTime`), `<transform>` (`location`, `scale`, `rotation`, `opacity`, `pivot`), ukuran setengah dimensi (`<size>`, `<property name="size">`), dan keyframe `<kf>`.
   - **Sanitasi Shader Pipeline GLSL ES 3.00**:
     - Berhasil menaikkan pass-rate kompilasi shader dari **60.2% (162/269)** menjadi **95.5% (257/269 pass, hanya tersisa 12 efek)**.
   - **Pembersihan Emoji 100% Bebas**:
     - Menghapus seluruh karakter emoji di `timeline-panel.ts`, `inspector-panel.ts`, `studio-ui.ts`, dan `main.ts`.
   - **Verifikasi**: Divalidasi lewat `scripts/test-import-render.js` dan `npm run verify:ui`, menghasilkan bukti visual kanvas 9:16 ter-render sempurna di `screenshot_imported_xml_rendered.png`.

4. **Penyempurnaan Tipografi & Font UI Home (Sesi 3)**:
   - **Latar Belakang**:
     - Pengguna meminta perbesaran font dan peningkatan kejelasan tipografi pada elemen Home screen: "WORKSPACE LOKAL", "PROYEK BARU", "Terbaru", dan kode bahasa "ID".
     - Font bawaan `index.html` menggunakan ukuran micro-type mobile (7px untuk kicker, 8px untuk dropdown urutkan, 8px untuk label Proyek Baru, dan 8px untuk kode bahasa).
   - **Perubahan yang Diterapkan**:
     - Mengintegrasikan font **Plus Jakarta Sans** ke dalam `css/theme.css` sebagai `--font-main` primer bersama `Inter` untuk ketajaman glyph antialiasing maksimal.
     - Memperbesar `WORKSPACE LOKAL` (`#workspaceKicker`): dari 7px menjadi **11px** (bold 700, letter-spacing 0.14em, uppercase).
     - Memperbesar judul `Proyek Anda` (`#workspaceTitle`): menjadi **26px** (extrabold 800) + badge jumlah proyek 13px.
     - Memperbesar tombol dropdown `Terbaru` (`#projectSortLabel`): container 38px, font teks **13px** (semibold 600).
     - Memperbesar tombol `+ PROYEK BARU` (`#newProjectFab`): container 38px, ikon `span` 18px, label `b` **13px** (extrabold 800, uppercase).
     - Memperbesar tombol bahasa `ID` (`#homeLanguageBtn`): container 36px, teks kode **12px** (bold 800).
   - **Verifikasi**: Diuji dan diambil screenshot verifikasi visual di `screenshot_home_typography.png`. Commit `740220f`.

5. **Eksekusi Optimasi Editor AM-PC Sesuai Review Hermes (Sesi 4)**:
   - **Langkah 1 (`preload.js` — Commit `f1c0a10`)**:
     - Menerapkan *leading + trailing throttle gate* (250ms) pada `MutationObserver` (`preload.js:1194`).
     - Menghilangkan beban eksekusi 7 fungsi DOM traversal yang sebelumnya terpicu 60× per detik akibat mutasi teks timecode (`#previewTime` / `#timeRead`) selama playback.
   - **Langkah 2 (`main.js` — Commit `5010357`)**:
     - Menambahkan `backgroundThrottling: false` ke `webPreferences` pada BrowserWindow utama untuk mencegah penurunan frame rate saat jendela tidak fokus.
   - **Langkah 3 & 4 (`desktop-engine.js` — Commit `88658c7`)**:
     - Menambahkan penanganan roda mouse (`wheel`) di `#timelineScroll`: scroll vertikal mouse otomatis menggeser timeline horizontal (`scrollLeft += deltaY`), dan `Ctrl + Wheel` meneruskan ke fungsi zoom bawaan `timeline.onZoomWheel(e)`. Gesture pan trackpad (`deltaX`) dan zoom ruler native tetap dijaga.
     - Membatasi *scope* pencarian kartu efek `.effectCard` agar hanya memeriksa di dalam `#drawer` saat terlihat, bukan memindai satu dokumen penuh.
