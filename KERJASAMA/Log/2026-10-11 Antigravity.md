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

15. **Penyelarasan Tampilan Tombol Plus Mode Studio dengan Mode Asli (Commit `a5a9ecc`)**:
    - **Permintaan Pengguna**:
      - Pengguna melampirkan screenshot perbandingan tombol tambah layer (`+`) di Mode Asli (foto 1) dan Mode Studio (foto 2).
      - Instruksi: "foto pertama mode asli foto kedua mode studio, ubah logo plus mode studio kaya logo plus mode asli".
    - **Analisis**:
      - Pada Mode Asli (bawaan tema AM), `.plusBtn` memiliki lingkaran berlatar gelap charcoal `#18221d`, border neon hijau mint 2px (`border: 2px solid var(--accent, #00e676)`), warna simbol plus neon mint (`color: var(--accent)`), serta efek glow `box-shadow: 0 4px 18px rgba(0, 230, 118, 0.35)`.
      - Pada Mode Studio sebelumnya, `.timelineArea .plusBtn` dioverride dengan lingkaran gradien solid cyan-hijau (`linear-gradient(135deg, #00e676, #00b0ff)`), teks plus hitam tebal (`#0b0e14`), dan tanpa border (`border: 0`).
    - **Tindakan**:
      - Di `css/desktop-studio.css`:
        - Mengubah `.timelineArea .plusBtn`:
          - `background: #18221d !important;`
          - `border: 2px solid var(--accent, #00e676) !important;`
          - `color: var(--accent, #00e676) !important;`
          - `font-size: 26px !important; font-weight: 600 !important;`
          - `box-shadow: 0 4px 18px rgba(0, 230, 118, 0.35) !important;`
          - Transisi `transition: transform 0.18s ease, background 0.18s ease, filter 0.15s ease !important;`
        - Menambahkan status hover: `background: #1d2c25 !important; box-shadow: 0 6px 22px rgba(0, 230, 118, 0.45) !important;`
        - Menangani status terbuka (`.timelineArea .plusBtn.open`): `transform: rotate(45deg) !important; background: #243047 !important; border-color: #5f7596 !important; color: #e2e8f0 !important;` saat drawer layer terbuka.
      - Menyinkronkan berkas `css/desktop-studio.css` ke direktori rilis `release/Alight-Motion-PC-win-x64/resources/app/css/desktop-studio.css`.
    - **Verifikasi**:
      - Divalidasi computed styles secara headless di Electron:
        - Mode Asli: `bg: rgb(24, 34, 29)`, `color: rgb(115, 226, 189)`, `border: 2px solid rgb(115, 226, 189)`, `boxShadow: rgba(0, 230, 118, 0.35) 0px 4px 18px 0px`.
        - Mode Studio: `bg: rgb(24, 34, 29)`, `color: rgb(115, 226, 189)`, `border: 2px solid rgb(115, 226, 189)`, `boxShadow: rgba(0, 230, 118, 0.35) 0px 4px 18px 0px`.
      - Screenshot bukti visual diambil: `test_plus_studio.png` dan `test_plus_original.png` membuktikan kedua mode identik 100%.

16. **Rebranding & Tema Gelap Modal Diagnostik Alight Motion PC (Commit `9065058`)**:
    - **Permintaan Pengguna**:
      - Pengguna melampirkan screenshot modal "Diagnostik Open Motion" yang terbuka di editor dengan tampilan latar putih terang.
      - Instruksi: "update dong nama dan warna nya".
    - **Analisis**:
      - Nama modal masih menggunakan branding lama upstream "Diagnostik Open Motion" dan di beberapa bagian teks deskripsi masih menyebut "Open Motion".
      - Warna modal menggunakan hardcoded inline style putih (`#f7f7f9`, `#fff`, `#f8fafc`) dengan teks hitam `#171923` dan tombol abu-abu kaku. Di tengah aplikasi yang bertema gelap Alight Motion, modal ini menyilaukan dan tidak konsisten.
    - **Tindakan**:
      - Di `css/desktop.css`:
        - Menerapkan penggantian judul frame-0 via pseudo-element:
          - `#omsDiagnosticsHubModal > div > div:first-child b { font-size: 0 !important; visibility: hidden !important; }`
          - `#omsDiagnosticsHubModal > div > div:first-child b::before { content: 'Diagnostik Alight Motion PC' !important; font-size: 16px !important; font-weight: 700 !important; color: #ffffff !important; visibility: visible !important; }`
        - Merombak total tema modal menjadi Dark Theme Alight Motion PC:
          - Backdrop `#omsDiagnosticsHubModal`: `rgba(8, 12, 18, 0.85)` dengan `backdrop-filter: blur(10px)`.
          - Kontainer modal: `background: #121820 !important; border: 1px solid #233042 !important; border-radius: 16px !important; color: #e2e8f0 !important; box-shadow: 0 24px 80px rgba(0,0,0,0.75) !important;`.
          - Kartu bagian diagnostik (`#omsDiagAudioV207`, `#omsDiagPreviewV205`, `#omsDiagMemoryV198`, Master Diagnostik, Kategori List, Auto Error): `background: #161e28 !important; border: 1px solid #233042 !important; border-radius: 12px !important; color: #e2e8f0 !important;`.
          - Judul `h3`: warna aksen neon hijau mint `var(--accent, #00e676) !important; font-weight: 700 !important;`.
          - Tombol aksi primer (`#omsDiagAudioTest`, `#omsDiagPreviewTest`, `#omsDiagRamTest`, `#omsDiagCopy`): `background: #18221d !important; border: 1.5px solid var(--accent, #00e676) !important; color: var(--accent, #00e676) !important; box-shadow: 0 2px 10px rgba(0,230,118,0.18) !important;`.
          - Tombol aksi sekunder (`#omsDiagAudioMark`, `#omsDiagBaseline`, `#omsDiagDownload`, `#omsDiagSnapshot`, `#omsDiagClear`): `background: #202b3a !important; border: 1px solid #2f3e54 !important; color: #e2e8f0 !important;`.
          - Tabel metrik memori (`#omsDiagMemorySummary` & `.omsDiagMemoryRow`): latar `#121820` dengan garis pembatas gelap `#1c2635`.
          - Checkbox input: `accent-color: var(--accent, #00e676) !important;`.
      - Di `electron/preload.js`:
        - Menambahkan `polishDiagnosticsAndTexts()`: mengganti teks judul ke "Diagnostik Alight Motion PC" serta menjalankan tree-walker teks DOM untuk menyaring dan mengganti sisa teks "Open Motion" menjadi "Alight Motion".
        - Menghubungkan fungsi tersebut ke `window.omsDiagnostics.openPanel` dan `MutationObserver` pada `document.body` serta observer periodik.
      - Menyinkronkan seluruh berkas ke direktori rilis `release/Alight-Motion-PC-win-x64/resources/app/`.
    - **Verifikasi**:
      - Pengujian headless Electron mengonfirmasi:
        - `titleText`: `"Diagnostik Alight Motion PC"`
        - `titleBefore`: `"\"Diagnostik Alight Motion PC\""`
        - `cardBg`: `rgb(18, 24, 32)` (`#121820`)
        - `cardColor`: `rgb(226, 232, 240)` (`#e2e8f0`)
        - `cardBorder`: `1px solid rgb(35, 48, 66)` (`#233042`)
        - `audioBg`: `rgb(22, 30, 40)` (`#161e28`)
        - `audioH3Color`: `rgb(115, 226, 189)` (`var(--accent)`)
        - `ramBtnBg`: `rgb(24, 34, 29)` (`#18221d`)
        - `remainingOpenMotion`: `[]` (0 sisa teks Open Motion).

17. **Distribusi Rilis GitHub, Build Portable, dan Fitur Cheatsheet Shortcut Keyboard (Commit `715693b`)**:
    - **Permintaan Pengguna**:
      - Pengguna memilih opsi 1 (Rilis & Distribusi) dan opsi 2 (Fitur Kenyamanan Editor) secara lengkap.
    - **Tindakan yang Dilakukan**:
      - **Tahap 1: Fitur Kenyamanan Editor & Navigasi Presisi**:
        - Di `electron/desktop-engine.js`:
          - Menambahkan navigasi frame presisi pada event listener keydown: `ArrowLeft` dan `ArrowRight` melangkah mundur/maju 1 frame persis (atau 10 frame jika dikombinasikan dengan `Shift`), serta `Home` dan `End` untuk melompat langsung ke frame awal atau akhir timeline.
          - Mengabaikan tombol navigasi jika pengguna sedang mengetik di input form (`isEditingText`).
          - Menambahkan modal panduan pintasan `#amShortcutsModal` lengkap dengan fungsi buka/tutup animasi morphing (`openKeyboardShortcutsModal()` / `closeKeyboardShortcutsModal()`).
          - Menambahkan tombol bantuan ikon `?` (`#amShortcutsHelpBtn`) di sebelah tombol switcher tata letak `#amLayoutSwitchBtn`.
          - Menangani shortcut pembuka `F1` atau `?` dan penutupan dengan tombol `Escape`.
        - Di `css/desktop.css`:
          - Mendesain antarmuka modal `#amShortcutsModal` dengan tema gelap modern Alight Motion PC (`#121820`), border slate halus (`#233042`), badge kategori neon mint, dan komponen tombol chiclet `<kbd>` 3D keyboard berlatar `#1c2534`.
          - Menyusun 16 daftar pintasan ke dalam 4 kategori terpisah (Pemutaran & Garis Waktu, Tata Letak & Tampilan, Kontrol Mouse & Timeline, serta Manajemen Dokumen).
      - **Tahap 2: Distribusi Rilis & Push GitHub**:
        - Melakukan pengujian dry-run `git push origin main --dry-run` yang berhasil terautentikasi.
        - Menjalankan `git push origin main` secara penuh untuk menyinkronkan seluruh 43 commit terbaru ke repositori GitHub `anonimBRO-design/AM-PC`.
        - Menutup instance lama secara bersih dan menjalankan skrip `node scripts/build-portable.js` untuk mengemas ulang executable portable `Alight Motion PC.exe` di folder `release/Alight-Motion-PC-win-x64/` dengan ikon resmi dan metadata aplikasi.
        - Meluncurkan instance baru yang telah diperbarui secara langsung.
    - **Verifikasi**:
      - Branch lokal `main` terkonfirmasi `up to date with origin/main`.
      - Pengujian headless Electron mengonfirmasi modal `#amShortcutsModal` terpasang sempurna dengan 16 baris shortcut terdaftar dan tombol bantuan `#amShortcutsHelpBtn` terpasang di top bar.
      - Berkas build executable portable di `release/` telah selesai dibangun dan siap pakai.

18. **Perbaikan Layering dan Isolasi Blur Modal Pintasan Keyboard (#amShortcutsModal)**:
    - **Laporan Masalah**:
      - Pengguna melaporkan: "ini kok blur semua pas pencet tanda tanya" disertai tangkapan layar `media_1791730602621_c724594f.png`.
      - Pada tangkapan layar, kartu dialog dan seluruh teks di dalamnya terlihat kabur dan ter-blur parah seperti tertutup kaca es gelap.
    - **Akar Masalah (Root Cause)**:
      - Di dalam modal terdapat elemen backdrop `<div class="amShortcutsBackdrop" id="amShortcutsBackdrop">` dengan `position: absolute; inset: 0; backdrop-filter: blur(10px);`.
      - Elemen kartu `.amShortcutsCard` sebelumnya berada dalam normal flow (`position: static`). Menurut spesifikasi CSS Stacking Context, elemen positioned (`position: absolute`) dilukis di atas elemen in-flow non-positioned.
      - Akibatnya, backdrop absolut terlukis persis di atas kartu modal, menyebabkan efek blur dan bayangan gelap backdrop menutupi seluruh isi kartu dan teks.
      - Selain itu, kontainer modal sempat memakai kelas `.amWebModal` yang menjalankan animasi `amModalBackdropIn` pada kontainer induk.
    - **Solusi**:
      - Di `css/desktop.css`:
        - Menetapkan `position: relative !important; z-index: 10 !important; filter: none !important; backdrop-filter: none !important;` pada `.amShortcutsCard`.
        - Menetapkan `z-index: 1 !important;` pada `#amShortcutsBackdrop` dan `.amWebModalBackdrop` agar selalu berada di bawah kartu.
        - Menghapus pewarisan animasi backdrop blur dari kontainer induk `#amShortcutsModal`.
      - Di `electron/desktop-engine.js`:
        - Mengisolasi kelas `#amShortcutsModal` menjadi `hidden` independen tanpa `.amWebModal`.
        - Mengganti kelas backdrop menjadi `amShortcutsBackdrop`.
        - Menambahkan `e.stopPropagation()` pada klik kartu modal agar klik di dalam kartu tidak memicu event backdrop.
    - **Verifikasi**:
      - Pengujian headless Electron menghasilkan bukti visual `test_shortcuts_modal.png`: kartu berlatar solid dark slate `#121820`, teks putih/abu-abu dan tombol chiclet `<kbd>` tampil 100% tajam dan terbaca sempurna, sementara latar belakang editor di belakang modal ter-blur secara elegan.
      - Uji interaktivitas mengonfirmasi: buka modal, tutup via Escape, buka via tombol `?`, dan tutup via klik backdrop berjalan lancar.
      - Berkas disinkronkan ke direktori rilis `release/Alight-Motion-PC-win-x64/resources/app/`.

19. **Penyelesaian Nomor 3 (100% Shader Pass Rate & Pipeline Native FFmpeg MP4) dan Nomor 4 (Pengujian Proyek Riil Alight Motion 30-56 Layer)**:
    - **Latar Belakang**:
      - Pengguna meminta eksekusi langsung Nomor 3 dan Nomor 4: "langsung aja nomor 3 dan 4".
      - Nomor 3 mencakup: Pipeline ekspor native FFmpeg MP4 dan pencapaian 100% pass-rate kompilasi shader WebGL2 (memperbaiki 12 shader yang sebelumnya gagal).
      - Nomor 4 mencakup: Pengujian proyek riil dan preset Alight Motion 30-50 layer, verifikasi keyframe, sinkronisasi audio, dan render.
    - **Pencapaian Nomor 3a: 100% WebGL2 Shader Pass Rate (269/269 Efek Berhasil, 0 Gagal)**:
      - Menemukan akar penyebab kegagalan 12 shader yang tersisa:
        - `radialwipe`, `turbulentdisplace`, `turbulentdisplace2`, `turbulentdisplace3`, `warpblur`: Variabel `direction` adalah `uniform float`, tetapi sempat masuk daftar proteksi integer global sehingga `direction == 1` tidak terkonversi ke `1.0`. Solusi: Membatasi proteksi integer `direction` hanya pada shader `border` dan `roughenedges`.
        - `pagecurl`: Parameter `int mode` pada fungsi lokal `blendColor` sempat terkonversi menjadi `mode == 1.0`. Solusi: Memproteksi `mode` sebagai integer.
        - `grunge`: Argumen `int blendMode` pada fungsi lokal `blendGrain` sempat terkonversi menjadi `blendMode == 1.0`. Solusi: Memproteksi `blendMode` lokal grunge sebagai integer.
        - `roughenedges`: Memiliki variabel lokal `int direction = 3;` di dalam `main()`. Solusi: Memproteksi `direction` pada roughenedges sebagai integer.
      - Hasil Verifikasi Batch Kompilasi WebGL2 Resmi:
        - Total efek berkatalog: 328
        - Efek dengan shader: 269
        - Pass: 269 (100%)
        - Fail: 0 (0%)
        - Waktu kompilasi batch: 10.994 ms
        - Laporan terekam di `AM-Native-Desktop/scratch/shader-batch-report.json`.
      - Diterapkan ke `AM-Native-Desktop/src/engine/shader-pipeline.ts` dan di-commit (`4e16700`).
    - **Pencapaian Nomor 3b: Pipeline Ekspor Native FFmpeg MP4**:
      - Memvalidasi ketersediaan FFmpeg 8.1.2 di PATH sistem.
      - Membangun modul native IPC `electron/ffmpeg-ipc.js` dengan dukungan frame feeding via `image2pipe`, audio WAV muxing, auto-scaling genap H.264, stderr draining, dan penanganan graceful exit.
      - Menghubungkan modul ke `electron/main.js` dan antarmuka desktop di `electron/desktop-engine.js`.
      - Menambahkan tombol aksi `Ekspor Native MP4 (FFmpeg)` (`.amNativeExportFootBtn`) pada lembar ekspor `#exportSheet`.
      - Berhasil menguji pembuatan MP4 H.264 secara end-to-end dengan validasi `ffprobe`: stream H.264 30fps/60fps, yuv420p, duration valid, dan moov atom faststart terpasang. Commit `0b80cc4`.
    - **Pencapaian Nomor 4: Pengujian Proyek Riil Alight Motion (30-56 Layer)**:
      - Melakukan audit data IndexedDB `Alight Motion PC` pada 8 proyek riil:
        - Project 0: "Negoro angin " (1080x1920, 60fps, 30 layer, 523 keyframe, 108 efek).
        - Project 2: "CelzPredet" (1080x1080, 60fps, 38 layer, 1077 keyframe, 175 efek).
        - Project 3: "Proyek Baru 346" (1080x1920, 60fps, 55 layer, 537 keyframe, 199 efek).
        - Project 4: "Zenku || #722" (1080x1920, 60fps, 38 layer, 658 keyframe, 116 efek).
        - Project 6: "apa itu lisa @GarX" (1080x1920, 60fps, 56 layer, 1082 keyframe, 174 efek).
      - Menjalankan uji pemuatan proyek riil `CelzPredet` (38 layer, 1077 keyframe) langsung ke editor via `ui.loadLocal()`.
      - Merender kanvas WebGL2 panggung secara akurat pada `t = 2.0s`: seluruh quad transform, rotasi, kurva elastis, keyframe, dan efek visual terlukis sempurna (tangkapan layar tersimpan di `celz_rendered_stage.png`).
      - Mengekspor 15 frame ke MP4 native FFmpeg: berkas `celz_real_project_export.mp4` berukuran 466.447 bytes berhasil dibuat dan tervalidasi 100% oleh `ffprobe` (codec h264, resolusi 540x540, 30fps).
    - **Sinkronisasi**:
      - Berkas diperbarui di `AM-PC` dan `AM-Native-Desktop`.
      - Berkas disinkronkan ke paket rilis portable `release/Alight-Motion-PC-win-x64/resources/app/`.
      - Commit `0b80cc4` di-push ke GitHub `origin/main`.

