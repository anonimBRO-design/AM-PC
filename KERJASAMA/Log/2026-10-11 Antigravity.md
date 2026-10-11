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

6. **Penyesuaian Navigasi Mouse Wheel Timeline (Sesi 5 — Commit `cc135f0`)**:
   - Pengguna meminta agar scroll wheel biasa tetap menggulir daftar track vertikal (atas-bawah) untuk melihat layer T1..T30.
   - Mengubah navigasi wheel di `desktop-engine.js`:
     - Roda mouse biasa: native vertical scroll (atas-bawah) tanpa interupsi.
     - `Shift + Wheel`: pan horizontal timeline (kiri-kanan waktu) dengan rasio mulus 1x.
     - `Ctrl + Wheel`: zoom timeline (diteruskan ke `timeline.onZoomWheel(e)`).

7. **Fix Pembatalan Mode Multi-Select saat Menggeser/Mengklik Timeline (Sesi 6)**:
   - **Masalah**: Saat mode multi-select aktif, menggeser timeline kiri-kanan dengan klik kiri mouse menyebabkan aplikasi keluar dari mode multi-select dan drawer tertutup.
   - **Root Cause**:
     - `lane.onclick`, `sc.onclick`, dan `emptyPan` memanggil `TimelineController.prototype.clearTimelineLayerSelection()`.
     - Fungsi tersebut secara tanpa syarat memanggil `ui?.clearLayerMultiSelection?.()` dan `ui?.closeDrawer?.()`, mereset `layerMultiSelectMode = false`.
     - Selain itu, `isEmptyTimelineTarget` mengembalikan `false` untuk `.trackLane`, sehingga seret pan kiri-kanan pada lane yang belum terpilih tidak merespons, dan saat mouse dilepas, `lane.onclick` memicu pembatalan mode.
   - **Solusi di `electron/desktop-engine.js`**:
     - Mem-patch `TimelineController.prototype.clearTimelineLayerSelection`: jika `ui?.layerMultiSelectMode` aktif, operasi dibatalkan sehingga layer terpilih dan drawer tetap terjaga aman.
     - Mem-patch `TimelineController.prototype.isEmptyTimelineTarget`: saat `ui?.layerMultiSelectMode` aktif, area kosong `.trackLane` diizinkan sebagai target pan sehingga seret kiri-kanan mouse dapat menggeser timeline secara mulus.
   - **Sinkronisasi**: Berkas disinkronkan ke `release/alight-motion-pc-win-x64/resources/app/electron/desktop-engine.js`.

8. **Dual Layout Engine: Mode Studio vs Mode Asli (Sesi 7)**:
   - **Permintaan Pengguna**: Menyediakan 2 mode tata letak editor:
     1. **Mode Studio AM-PC** (Mode Sekarang): Preview di atas, Timeline di bawah 280px, Inspector docked di kanan.
     2. **Mode Asli Open-Motion** (Mode Asli): Preview di kiri, Timeline di kanan (berdampingan / side-by-side), persis seperti di web upstream https://hada45.github.io/Open-Motion/.
   - **Solusi Arsitektur (Tanpa Sentuh `index.html`)**:
     - Memisahkan aturan layout grid Studio ke file terpisah `css/desktop-studio.css` (898 baris), sementara `css/desktop.css` tetap memegang shell sistem (kontrol jendela, menu, modal, beat marker).
     - Menginjeksi `desktop-studio.css` melalui elemen `<style id="amStudioLayoutCss">` yang dapat di-toggle aktif/nonaktif secara instan (`disabled = true/false`).
     - Saat **Mode Asli** aktif: style Studio dinonaktifkan, sehingga layout fallback 100% ke CSS bawaan `index.html` (Preview kiri, Timeline kanan, divider drag `#editorSplitHandle`, timeline full height). `#drawer` dikembalikan ke `.timelineArea`.
     - Saat **Mode Studio** aktif: style Studio diaktifkan, layout Preview atas & Timeline bawah 280px berjalan kembali.
     - Menyediakan tombol switcher `#amLayoutSwitchBtn` di bilah atas `.editorTop` dengan ikon indikator dan shortcut keyboard **`F8`** untuk beralih secara langsung kapan saja.
   - **Sinkronisasi**: Seluruh file diperbarui dan disalin ke `release/alight-motion-pc-win-x64/resources/app/`.

9. **Fix Toggle Mode Layout & Penyelarasan Kanvas di Mode Asli (Sesi 8)**:
   - **Masalah yang Dilaporkan**:
     1. Switcher tata letak macet / tidak bisa beralih kembali ("lah kok gabisa diganti").
     2. Kanvas pada Mode Asli terdorong jauh ke pinggir kiri dan muncul void hitam besar antara kanvas dan timeline ("kok pinggir banget tuh, kenapa lu gak ambil source code asli nya aja?").
   - **Root Cause Analysis (Terbukti 100% via Headless Debugging)**:
     1. Di `css/desktop-studio.css`, baris 59 memiliki `transition: grid-template-columns 0.18s cubic-bezier(...) !important;`. Menurut spesifikasi CSS Transitions, transisi antar-tata-letak grid dengan tanda tangan track berbeda (`minmax(420px, 1.2fr) minmax(520px, 1fr)` ke `1fr 0px`) tidak dapat diinterpolasi oleh Blink/Chromium. Hal ini menyebabkan Chromium membatalkan kalkulasi transisi dan membekukan `grid-template-columns` pada nilai `776px 647px` secara permanen saat beralih kembali ke Studio.
     2. Polusi `sessionStorage`: Saat pertama kali berjalan di Mode Studio, fungsi pembaca split upstream mengira lebar 1fr adalah rasio kolom pertama yang diseret user, lalu menyimpan rasio `~0.78` ke `sessionStorage.getItem('omsDesktopCanvasSplitRatioV441A')`. Akibatnya saat beralih ke Mode Asli, preview dipaksa melebar hingga 78% layar, timeline terhimpit di 22% ujung kanan, dan kanvas 9:16 terperangkap di sebelah kiri dengan jarak kosong hitam raksasa di sebelah kanannya.
     3. Tombol switcher melakukan penulisan ulang `innerHTML` setiap heartbeat 400ms tanpa memeriksa apakah mode berubah, yang berpotensi membatalkan event klik pointer.
   - **Solusi yang Diterapkan**:
     1. Menghapus properti `transition: grid-template-columns` dari `.editorMain` di `css/desktop-studio.css`.
     2. Menggandakan mekanisme nonaktif stylesheet dengan `style.disabled` dan `style.media = 'not all'` / `style.media = 'all'`.
     3. Menambahkan pembersihan inline style `grid-template-columns` dan `grid-template-rows` pada `.editorMain` saat perpindahan mode.
     4. Menghapus rasio split yang terpolusi dari `sessionStorage` (`omsDesktopCanvasSplitRatioV441A`) saat beralih ke Mode Asli, sehingga tata letak split kembali 100% mengikuti kalkulasi asli Open-Motion (`minmax(420px, 1.2fr) minmax(520px, 1fr)` atau ~48% / 52%).
     5. Di `css/desktop.css`, menambahkan aturan khusus Mode Asli: `.previewArea` tanpa border-bottom, `.viewport` dengan `place-items: center`, `#canvasWrap` dengan `margin: auto`, serta menyembunyikan handle split `#desktopCanvasSplitToolbarBtn` di Mode Studio dan menampilkannya di Mode Asli.
     6. Mengoptimalkan `updateLayoutSwitcherBtn()` dengan `dataset.mode` caching agar idempoten dan tidak menimpa DOM bila mode tidak berubah.
   - **Verifikasi**:
     - Diuji via script Electron headless `debug-asli.js`:
       - Mode Asli: Preview 776.7px (kiri 0), Timeline 647.3px (kiri 776.7px), Kanvas presisi di tengah (margin kiri 237.86px, margin kanan 237.86px).
       - Mode Studio: Preview full width 1424px (atas 50px), Timeline full width 1424px (bawah 555px, tinggi 280px), Kanvas di tengah (margin kiri 561.5px, margin kanan 562.5px).
       - Beralih bolak-balik berulang kali berjalan 100% mulus dan akurat.
     - Seluruh berkas disinkronkan ke direktori `release/alight-motion-pc-win-x64/resources/app/`.

10. **Perbaikan Injeksi Mandiri Studio Layout CSS (Sesi 9 - Commit `afa204d`)**:
    - **Masalah yang Dilaporkan**:
      - User menekan tombol ganti tata letak, namun timeline tidak berpindah ke bawah ("mana kok gak kebawah????????????").
    - **Root Cause Analysis**:
      - Proses Electron (`Alight Motion PC.exe`, PID 316) telah berjalan sejak pukul 18:33 WIB, sebelum `desktop-studio.css` dan dual layout dibuat pada commit `6010169` (pukul 18:59 WIB).
      - Di Electron, `electron/main.js` dievaluasi hanya sekali saat proses Node utama pertama kali dimulai.
      - Menekan `Ctrl + R` (reload WebContents) hanya memuat ulang renderer (`index.html`, `preload.js`, dan skrip renderer), tetapi **TIDAK** memuat ulang proses utama `main.js`.
      - Karena `main.js` yang sedang berjalan di memori masih versi lama pukul 18:33 WIB, fungsi `webContents.insertCSS(studioCss)` di event `dom-ready` tidak pernah dieksekusi.
      - Akibatnya, elemen `<style id="amStudioLayoutCss">` bernilai `null` di renderer, sehingga fungsi `toggleAmEditorLayout('studio')` tidak menemukan aturan CSS Studio untuk diaktifkan.
    - **Solusi Arsitektur Mandiri (Self-Healing)**:
      - Menambahkan fungsi `ensureStudioCss()` di `electron/desktop-engine.js` menggunakan panggilan sinkron lokal `XMLHttpRequest('GET', 'css/desktop-studio.css', false)`. Jika `<style id="amStudioLayoutCss">` belum ada atau kosong, skrip renderer langsung membuat dan mengisinya seketika (< 1ms).
      - Menambahkan `injectStudioCss()` di `electron/preload.js` menggunakan `fs.readFileSync(path.join(__dirname, '../css/desktop-studio.css'))` saat event `DOMContentLoaded` dan perpindahan tampilan.
      - Memastikan `setupLayoutSwitcher()` memanggil `initLayoutState()` secara mandiri saat DOM siap.
      - Menyinkronkan seluruh perubahan ke direktori rilis `release/alight-motion-pc-win-x64/resources/app/`.
    - **Verifikasi**:
      - Diuji dengan skrip simulasi klik headless `test-click.js` tanpa bantuan injeksi dari `main.js`:
        - Mode Asli: Preview 776.7px (kiri 0), Timeline 647.3px (kiri 776.7px).
        - Klik Switcher (Mode Studio): Preview 1424px (atas 50px), Timeline 1424px (bawah 555px, tinggi 280px).
      - Commit `afa204d` tersimpan di branch `main`.

11. **Penyempurnaan Widescreen Studio, Pengatur Tinggi Timeline, & Auto-Fit Kanvas (Sesi 10)**:
    - **Masalah yang Ditemukan (via Screenshot Pengguna)**:
      - Pada Mode Studio (preview di atas, timeline di bawah), area preview hanya mengisi lebar ~776px dan menyisakan ruang kosong hitam sebesar 664px di sebelah kanan (seperti yang ditandai garis putih pada tangkapan layar ketiga).
      - Kanvas 9:16 terdorong ke kiri dan tidak berada di tengah layar.
      - Tinggi timeline terkunci kaku di 280px tanpa opsi pengaturan tinggi vertikal.
    - **Hasil Alignment Desain (/grill-me)**:
      1. Area preview pada Mode Studio dibuat memenuhi 100% lebar layar (kanvas tepat di tengah layar secara horizontal dan vertikal). Saat drawer/inspector dibuka, dock kanan 400px baru muncul secara otomatis.
      2. Tinggi timeline di Mode Studio dapat ditarik naik-turun menggunakan handle geser vertikal (batas minimal 180px, batas maksimal dinamis, default 280px, tersimpan di localStorage).
      3. Zoom kanvas disesuaikan secara otomatis (Fit to Viewport) saat beralih mode tata letak agar komposisi selalu pas dan tidak terpotong.
    - **Root Cause Analysis Ruang Hitam Kosong**:
      - Pada `index.html:37318`, fungsi `applySplit` upstream Open-Motion selalu memaksakan inline style `main.style.setProperty('grid-template-columns', '${previewPx}px minmax(0,1fr)', 'important')` setiap kali jendela berubah ukuran atau proyek dimuat.
      - Properti inline `!important` tersebut mengunci kolom pertama grid pada 776px dan menyisakan kolom kedua kosong, sehingga elemen `.previewArea` terperangkap di sebelah kiri.
    - **Solusi yang Diterapkan Tanpa Mengubah `index.html`**:
      1. Di `electron/desktop-engine.js`:
         - Menambahkan `protectStudioGrid()` yang mencegat `editorMain.style.setProperty` dan memasang MutationObserver pada atribut `style` untuk menghapus paksaan `grid-template-columns` dan `grid-template-rows` khusus saat Mode Studio aktif.
         - Menambahkan `setupTimelineVerticalResizer()`: memasang `#amTimelineResizeBar` dan menghubungkan `#editorSplitHandle` dengan event pointer drag untuk mengatur variabel CSS `--am-timeline-height`. Nilai disimpan ke `am_studio_timeline_height` di localStorage.
         - Menambahkan `refitEditorCanvas()`: otomatis memicu klik `#fitBtn` / `ui.applyCompositionFitZoom()` dan resize WebGL setelah pergantian mode dan perubahan ukuran timeline.
         - Menambahkan `watchDrawerForCanvasFit()`: memantau buka-tutup `#drawer` agar saat inspector terbuka/tertutup, zoom kanvas menyesuaikan ulang secara otomatis.
      2. Di `css/desktop-studio.css`:
         - Mengubah `.editorMain` menjadi `grid-template-columns: 1fr !important;` dan `grid-template-rows: minmax(0, 1fr) var(--am-timeline-height, 280px) !important;`.
         - Menambahkan `.editorMain:has(#drawer:not(.hidden)) { grid-template-columns: minmax(0, 1fr) 400px !important; }`.
         - Mengubah `.timelineArea` menjadi `grid-column: 1 / -1 !important;` sehingga selalu membentang penuh di baris kedua.
         - Memusatkan `.viewport` dan `#canvasWrap` dengan `place-items: center`, `justify-content: center`, dan `margin: auto`.
         - Memberi styling pada bar resizer vertikal `#amTimelineResizeBar` dan `#editorSplitHandle` dengan kursor `ns-resize`.
    - **Verifikasi**:
      - Diuji dengan skrip Electron headless `test-studio-layout.js`:
        - Mode Studio (drawer tertutup): Grid 1fr, preview memenuhi lebar penuh, tidak ada ruang hitam kosong.
        - Mode Studio (drawer terbuka): Grid minmax(0, 1fr) 400px, inspector dock di kanan 400px.
        - Tinggi timeline dinamis: variabel `--am-timeline-height` merespons perubahan ukuran.
        - Mode Asli: Grid minmax(420px, 1.2fr) minmax(520px, 1fr) kembali berfungsi 100% normal.
      - Seluruh berkas pembaruan disinkronkan ke direktori rilis `release/Alight-Motion-PC-win-x64/resources/app/`.

12. **Sinkronisasi Upstream Resmi (PR #32 Project Thumbnails Di-merge oleh Hada45)**:
    - **Peristiwa**:
      - PR #32 dari branch `anonimBRO-design/feat/project-thumbnails` resmi di-merge oleh pemilik Open-Motion (Hada45) pada commit `a12c5aa` (`08acabe`).
      - Akun `anonimBRO-design` sekarang resmi tercatat sebagai Kontributor ke-3 di repositori upstream `Hada45/Open-Motion`.
    - **Koreksi Terhadap Temuan Agent Lain**:
      - Agent Claude mengira commit `85e5555` adalah "fitur baru Hada yang belum dimiliki repo lokal".
      - Faktanya, `85e5555:index.html` memiliki hash `8816e9f9...` yang sudah identik dengan `index.html` lokal sejak hari pertama fork dibuat (Jebakan #1: menyimpulkan ketinggalan dari git log).
      - Satu-satunya perbedaan antara `HEAD:index.html` dan `upstream/main:index.html` adalah PR #32 milik anonimBRO-design sendiri (+22 / -6 baris pada `captureProjectThumbnail`).
    - **Tindakan**:
      - Menjalankan `git checkout upstream/main -- index.html`.
      - Memverifikasi hash: `git hash-object index.html` menghasilkan `be33d60e92a0a275af1c286df3aed262ab84e77f` (identik 100% dengan upstream).
      - Menyinkronkan `index.html` ke direktori rilis `release/Alight-Motion-PC-win-x64/resources/app/index.html`.
      - Memperbarui dokumentasi `AGENTS.md`, `KERJASAMA/Fakta.md` (F-01), dan `KERJASAMA/Handoff.md`.

13. **Pembersihan Tombol INFO dan Dialog Notice Eksperimental Startup**:
    - **Permintaan Pengguna**: Menghapus tombol "INFO" di bilah atas Beranda dan dialog popup catatan eksperimental saat startup ("info ga penting, hapus aja?").
    - **Tindakan**:
      - Di `electron/preload.js`:
        - Menghapus pembuatan tombol `#homeAMNoticeBtn` pada `mountActionButtons()` dan menghapus tombol tersebut jika ada di DOM.
        - Menyederhanakan `updateNotice()` agar `#experimentalNotice` disembunyikan secara permanen (`aria-hidden="true"`, `display: none !important`, `pointer-events: none !important`), serta menandai `window.__omsExperimentalNoticeAccepted = true` agar tidak ada dialog popup yang mengganggu startup.
      - Di `css/desktop.css`:
        - Menambahkan aturan global permanen: `#experimentalNotice, #homeAMNoticeBtn { display: none !important; pointer-events: none !important; visibility: hidden !important; opacity: 0 !important; }`.
      - Menyinkronkan seluruh berkas ke direktori rilis `release/Alight-Motion-PC-win-x64/resources/app/`.

14. **Eliminasi Flash Branding & Pop-in Tombol Top Bar Saat Refresh (Commit `b0fa0fd`)**:
    - **Masalah yang Dilaporkan**:
      - Pengguna melaporkan bahwa saat melakukan refresh (`Ctrl + R`), terlihat sekilas tulisan "Open Motion", ikon logo lama, tombol INSTAL, serta tombol AMFINDER & AMHUB belum muncul (pop-in terlambat).
      - Pengguna mengonfirmasi: "kalo proyek gapapa sekilas kosong", sehingga fokus perbaikan adalah bilah atas (top bar).
    - **Root Cause Analysis**:
      - Berkas `index.html` upstream berukuran 3.4 MB dengan ~34.000 baris script mesin di bawah elemen `#home`.
      - Chromium mulai merender elemen DOM bilah atas (baris 4165-4188) sebelum `DOMContentLoaded` ditembakkan, karena `DOMContentLoaded` harus menunggu seluruh 34.000 baris script selesai dieksekusi (~50-200ms).
      - Sebelumnya, `updateBrand()` dan `mountActionButtons()` hanya dijalankan di dalam event `DOMContentLoaded`. Akibatnya, pada first paint, Chromium sempat merender teks asli HTML ("Open Motion"), logo base64 Open Motion, dan susunan tombol tanpa AMFINDER/AMHUB.
    - **Solusi Arsitektur Frame-0**:
      1. **Typography & Wordmark**:
         - Di `css/desktop.css` dan early CSS, `.homeWordmark b` diatur dengan `font-size: 0 !important; visibility: hidden !important;`.
         - Menggunakan pseudo-element `::before` dengan `content: 'Alight Motion PC' !important; font-size: 15px !important; font-weight: 800 !important; visibility: visible !important;` sehingga Chromium seketika merender "Alight Motion PC" di frame ke-0 tanpa menunggu JavaScript.
      2. **Logo Resmi**:
         - `.homeMark img` disembunyikan permanen dengan `display: none !important;`.
         - Kontainer `.homeMark` diberi `background-image` logo Alight Motion squircle `icons/test_prime_am.png` (serta base64 data URI pada early CSS di `preload.js`).
      3. **Streaming MutationObserver Dini untuk AMFINDER & AMHUB**:
         - Di `preload.js`, streaming MutationObserver dijalankan langsung sejak skrip preload dievaluasi (sebelum DOM selesai). Begitu elemen `.homeTopActions` diparsing oleh Chromium (baris 4172), `#homeAMFinder` dan `#homeAMHub` langsung dipasang seketika, mendahului ribuan baris script upstream.
      4. **Pembersihan Tombol Bawaan Web**:
         - Tombol instal PWA (`#homeInstallBtn`), tombol info (`#homeAMNoticeBtn`), dan dialog `#experimentalNotice` disembunyikan permanen dengan `display: none !important;`.
    - **Verifikasi**:
      - Diuji dengan skrip simulasi reload headless `verify_topbar.js`:
        - `markImgDisplay`: `"none"`
        - `markContBg`: logo Alight Motion aktif
        - `wordmarkTextContent`: `"Alight Motion PC"`
        - `wordmarkBBeforeContent`: `"Alight Motion PC"`
        - `hasFinderBtn`: `true`
        - `hasHubBtn`: `true`
        - `installBtnDisplay`: `"none"`
        - `noticeDisplay`: `"none"`
      - Screenshot visual `test_topbar_after_reload.png` mengonfirmasi bilah atas tampil sempurna dan bersih.
      - Berkas disinkronkan ke direktori rilis `release/Alight-Motion-PC-win-x64/resources/app/`.
