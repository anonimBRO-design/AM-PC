# Log 2026-10-10 — Antigravity

Bagian dari [[README|protokol kerja bersama]].
Aturan: [[Aturan]] · Jebakan: [[Jebakan]] · Fakta: [[Fakta]] · State: [[Handoff]]

---

## Yang dikerjakan

Mengaktifkan kembali 2.846 baris CSS kustom (`css/theme.css` dan `css/desktop.css`) ke dalam aplikasi desktop melalui mekanisme injeksi Electron (`insertCSS`) sesuai permintaan user, tanpa mengubah atau mengotori `index.html`.

---

## Kronologi

### 1. User memberikan instruksi singkat: "itu css nya"

- Berdasarkan memori bersama di [[Handoff]] dan [[Fakta]] F-03, terdapat 2.846 baris CSS yang sebelumnya menganggur karena `index.html` telah di-sync ke upstream murni V5.209 tanpa link tag CSS eksternal.
- Memberikan pilihan kepada user via pertanyaan interaktif: user memilih opsi **"Aktifkan CSS desktop & tema tersebut ke aplikasi desktop melalui Electron (insertCSS tanpa mengotori index.html)"**.

### 2. Penyesuaian `electron/main.js`

- Menambahkan listener `mainWindow.webContents.on('dom-ready', ...)` yang membaca `css/theme.css` dan `css/desktop.css` kemudian menyuntikkannya dengan `mainWindow.webContents.insertCSS(...)`.
- Dengan cara ini:
  - `index.html` tetap 100% identik dengan upstream (upgrade aman).
  - Tampilan desktop widescreen dan tema gelap resmi Alight Motion tetap aktif saat aplikasi dijalankan.

### 3. Penyesuaian `electron/preload.js`

- Menambahkan hook `window.addEventListener('DOMContentLoaded', ...)` untuk menyematkan class `is-electron` ke `document.body`.
- Ini mengaktifkan penyesuaian khusus desktop di `desktop.css` (misalnya menyembunyikan tombol install PWA `#homeInstallBtn`).

### 4. Perbaikan pada file CSS

- **`css/theme.css`**: Memindahkan pernyataan `@import url('https://fonts.googleapis.com/css2?...')` ke baris paling atas agar tidak dibatalkan/diabaikan oleh engine parser CSS Chromium.
- **`css/desktop.css`**:
  - Mengubah `.editor` menjadi `.editor:not(.hidden)` agar kontainer editor tidak memaksa `display: grid !important` saat berada di layar awal (Home).
  - Menambahkan penegasan mutlak `.hidden, [hidden], .editor.hidden, .home.hidden { display: none !important; }` di baris terbawah file CSS (dicatat sebagai [[Jebakan]] §7).

### 5. Verifikasi & Build

- Verifikasi sintaks JavaScript: `node -c electron/main.js` dan `node -c electron/preload.js` berhasil tanpa galat.
- Build aplikasi portable: `node scripts/build-portable.js` berhasil membuat portable package terbaru di `release/Alight-Motion-PC-win-x64/`.

### 6. Perbaikan Penempatan Inspector & Docking Panel Kanan

- **Pertanyaan User**: "pas pencet kok inspector nya di bawah, fungsi di kanan apa itu?" (dengan screenshot).
- **Akar Masalah**: Area 380px di kanan atas adalah slot yang disiapkan untuk Inspector. Namun karena `#drawer` berada di dalam `<section class="timelineArea">` pada DOM `index.html`, ia gagal masuk ke grid cell `editorMain` dan tetap muncul di bawah. Selain itu, `.editorMain:has(> #drawer.hidden)` gagal menutup slot kanan saat kosong karena selektor `>`.
- **Perbaikan**:
  - `.editorMain` default `grid-template-columns: 1fr 0px`, dan saat `.editorMain:has(#drawer:not(.hidden))` aktif berubah menjadi `minmax(0, 1fr) 380px`.
  - `#drawer` diposisikan secara fixed di slot dock kanan (`top: 50px; right: 0; bottom: 280px; width: 380px`).
  - Saat tidak ada layer dipilih, panel kanan tertutup otomatis dan preview kembali memenuhi layar secara widescreen.
  - Menangani error `EPERM` di `scripts/build-portable.js` agar memberi pesan jelas jika aplikasi sedang berjalan saat build.
  - Menyalin file `css/desktop.css` terupdate langsung ke direktori release aplikasi.

### 7. Penyelesaian Benturan Spesifisitas Upstream V5.209 & Reparenting DOM

- **Masalah**: User mengabarkan inspector masih di bawah.
- **Akar Masalah**: Pada `index.html` baris 37671 terdapat aturan upstream dengan spesifisitas tinggi:
  `html:not(.omsMobileLandscapeDesktop) .timelineArea > #drawer:not(.hidden)`
  yang memaksakan `position: relative !important; grid-row: 3 !important; width: 100% !important;` di dalam timeline container.
- **Solusi Tuntas**:
  1. Di `electron/preload.js`: Menambahkan `dockDrawer()` (dengan `MutationObserver`) yang secara otomatis memindahkan elemen `#drawer` dari `.timelineArea` menjadi direct child dari `.editorMain`. Dengan ini, selector `timelineArea > #drawer` bawaan upstream tidak lagi berlaku.
  2. Di `css/desktop.css`: Menambahkan aturan `.editorMain > #drawer` (sebagai CSS Grid item Row 1, Col 2) serta memperkuat fallback dengan selektor ber-spesifisitas sama/lebih tinggi.
  3. Memperbarui file aset ke direktori `release/`.
  4. Aplikasi memerlukan **tutup (restart)** untuk memuat `preload.js` baru.

### 8. Penyempurnaan Tampilan Panel Inspector: Compact, Rapi & Bebas Terpotong

- **Masalah**: Panel inspector terpotong di sisi kanan dan elemen tombol terlalu besar/panjang memakan tempat vertikal.
- **Perbaikan**:
  1. Lebar dock panel dinaikkan menjadi **400px** sehingga baris quick tools (Kecepatan, Trim Kiri, Split, Trim Kanan) muat sempurna tanpa terpotong tepi panel.
  2. Tombol inspector (`.insBtn`) diubah ke format horizontal ringkas (ikon di kiri, nama di kanan, tinggi 48–52px) dengan 2 kolom.
  3. Tombol "HAPUS LAYER" (`#deleteLayer`) diperbaiki warnanya menjadi aksen merah destruktif elegan berukuran kompak (tinggi 34px), tidak lagi hijau tosca terang.
  4. Padding drawer body dan scrollbar dibuat lebih ramping (`thin scrollbar`).
  5. File `css/desktop.css` yang diperbarui telah disinkronkan ke direktori `release/`.

### 9. Implementasi Hitbox Seleksi Cyan Otentik Alight Motion (Hitbox & Outline)

- **Permintaan User**: "gw mau pas gw select itu ada hitbox apalah namanya itu kaya am asli warna cyan,outline nahhh".
- **Investigasi Akar Masalah**:
  1. Di `index.html` (baris 11365-11412), `WebGLRenderer.prototype.drawOverlay` secara default menggambar garis putus-putus putih tipis (`#f8fbff`, `setLineDash([8,6])`) dengan titik mint kecil (`#73e2bd`).
  2. Parahnya lagi, terdapat logika `boundarySegment(a, b)` yang sengaja menekan/menghilangkan garis jika koordinatnya berada di tepi komposisi (canvas W/H). Akibatnya, layer video/gambar atau bentuk yang berukuran satu layar penuh kanvas (misal 1080×1920) keempat sisinya sama sekali tidak memunculkan garis hitbox/outline!
- **Solusi Bersih Tanpa Ubah `index.html` (Rule #2)**:
  1. Dibuat modul baru `electron/am-hitbox.js`:
     - Meng-override `WebGLRenderer.prototype.drawOverlay` dan `Renderer.prototype.selectionBox`.
     - Menggambar bounding outline solid neon cyan (`#00e5ff`) dengan neon glow (`shadowColor: rgba(0, 229, 255, 0.75)`, blur 6) dan dark contrast backdrop.
     - Menghapus supresi tepi kanvas (`boundarySegment`) sehingga layer full-frame tetap memiliki outline seleksi yang jelas dan utuh.
     - 4 Corner handles berbentuk node bundar neon cyan dengan titik putih tengah (`#ffffff`).
     - 4 Midpoint handles (titik tengah tiap sisi) untuk indikator resize otentik Alight Motion.
     - Center pivot/anchor indicator berbentuk crosshair reticle cyan `#00e5ff`.
  2. Di `css/desktop.css`:
     - Menambahkan styling `.clip.sel` pada timeline dengan outline tebal 2.5px solid neon cyan `#00e5ff`, glowing box shadow, dan trim cyan.
     - Menambahkan aksen tepi `.trackHead.sel` berwarna cyan.
  3. Di `electron/main.js` & `electron/preload.js`:
     - Injeksi otomatis `electron/am-hitbox.js` ke main world DOM.
  4. Menyalin seluruh file yang diperbarui langsung ke folder bundle `release/Alight-Motion-PC-win-x64/resources/app/`.

### 10. Rebranding "Alight Motion PC", Integrasi In-App AM Finder & AM Hub, Font Inter, dan Pembersihan Title

- **Permintaan User**:
  - Cancel hitbox seleksi sebelumnya yang salah paham.
  - Tambah tombol `AMFINDER` menuju `amfinder.web.id` tetap di exe (tidak ke browser).
  - Tambah tombol `AMHUB` menuju `amhub.anonimbro.my.id` tetap di exe.
  - Ganti font ke yang mudah dibaca (disepakati font **Inter** via `/grill-me`).
  - Ganti nama brand ke **Alight Motion PC**.
  - Hapus tulisan "Single HTML" / "Open Motion V5.209 — Single HTML".
  - Ganti icon ke logo resmi Alight Motion.
- **Implementasi**:
  1. **In-App Web Modal (`#amWebModal`)**:
     - Ditambahkan ke `preload.js` dan di-style di `desktop.css` dengan dark card header, tombol reload, dan tombol close [X].
     - Tombol `AMFINDER` dan `AMHUB` disematkan di `.homeTopActions` di samping `AM LINK`.
     - Di `main.js`, dipasang listener `session.defaultSession.webRequest.onHeadersReceived` untuk menghapus `x-frame-options` dan `content-security-policy` pada domain `amfinder.web.id` dan `anonimbro.my.id` sehingga dapat dibuka mulus di dalam iframe exe.
  2. **Rebranding & Pembersihan Title**:
     - `mainWindow.on('page-title-updated', e => e.preventDefault())` dipasang di `main.js` dan window title diset ke `Alight Motion PC`.
     - Teks `.homeWordmark b` diganti menjadi `Alight Motion PC`.
     - Logo `.homeMark img` diganti ke `icons/alight-motion-512.png`.
  3. **Tipografi Inter**:
     - `@import` Google Font di `theme.css` diperbarui ke `Inter`.
     - Seluruh font antarmuka di-override ke `'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif !important`.
  4. **Pembatalan Hitbox**:
     - Modul `electron/am-hitbox.js` dikosongkan dan pencabutan pemanggilan di `main.js` serta `preload.js` dilakukan, dengan mempertahankan perbaikan dock inspector compact.
  5. Seluruh file disinkronkan ke folder release `release/Alight-Motion-PC-win-x64/resources/app/`.


---

### 11. Tombol Maximize, Window Modal Draggable, dan Split Screen dengan AM Hub (17:25)

- **Permintaan User**:
  - Buat tombol maximize untuk window web modal.
  - Window modal bisa digeser-geser (draggable).
  - Bisa split screen dengan AM Hub berdampingan (side-by-side split view).
- **Implementasi**:
  1. **Draggable Window Modal**:
     - Header modal (`#amWebModalHead`) dijadikan drag handle dengan cursor grab/grabbing.
     - Posisi window dimanipulasi dengan koordinat absolut dan clamping agar tidak keluar layar.
     - Ditambahkan proteksi pointer-events pada iframe saat dragging (`body.am-modal-dragging iframe { pointer-events: none; }`) agar gerakan mouse tidak terhenti saat melintasi iframe.
  2. **Tombol Maximize / Restore**:
     - Ditambahkan tombol `#amWebMaximize` di jajaran aksi header dengan ikon kotak tunggal (maximize) dan kotak ganda (restore).
     - State `.is-maximized` membuat modal memenuhi 100vw x 100vh tanpa border-radius.
     - Double click pada header juga memicu toggle maximize/restore.
  3. **Split Screen Berdampingan dengan AM Hub**:
     - Ditambahkan segmented switcher di header (`AM Finder`, `AM Hub`, `Split AM Hub`).
     - Pada mode split (`.mode-split`):
       - AM Finder ditampilkan di panel kiri dan AM Hub di panel kanan secara berdampingan (default 50:50).
       - Kedua iframe tetap aktif (tidak di-reload saat berganti tab) sehingga progres pencarian pengguna tidak hilang.
       - Disertakan divider vertikal yang dapat digeser (`.amWebSplitDivider`) untuk mengatur rasio lebar split sesuai keinginan pengguna.
       - Masing-masing panel memiliki bar identitas mini dengan tombol reload mandiri.
  4. Seluruh perubahan pada `electron/preload.js` dan `css/desktop.css` disinkronkan ke `release/Alight-Motion-PC-win-x64/resources/app/`.

---

### 12. Penyesuaian Logo Pojok Kiri Atas & Rebranding Dialog Notice ke Alight Motion PC (17:30)

- **Permintaan User**:
  - Logo pojok kiri atas tidak pas (terlalu kecil di dalam box hitam asimetris bergaris putih).
  - Teks dialog masih menampilkan "Open Motion masih dalam tahap eksperimen", minta di-update.
- **Implementasi**:
  1. **Logo Header Pojok Kiri Atas Presisi**:
     - Mengganti path gambar logo ke `icons/test_prime_am.png` yang memiliki rasio squircle Alight Motion resmi pas tanpa margin transparan berlebih.
     - Mereset styling container `.homeMark` & `.simpleHome .homeMark` di `desktop.css`: menghapus background hitam ganda, menghapus border inset putih bawaan `index.html`, dan mengunci ukuran ke `34px × 34px` dengan `border-radius: 9px`.
     - Menjajarkan posisi logo dengan teks wordmark `Alight Motion PC` secara vertikal (`gap: 10px; height: 38px; align-items: center;`).
  2. **Rebranding & Persistensi Dialog Notice (`#experimentalNotice`)**:
     - Seluruh teks pada dialog notice diperbarui:
       - Eyebrow: `ALIGHT MOTION PC`
       - Title: `Alight Motion PC masih dalam tahap eksperimen`
       - Seluruh penyebutan "Open Motion" pada heading dan paragraf diganti menjadi "Alight Motion PC".
     - Menambahkan penyimpanan status di `localStorage.setItem('am_notice_accepted', 'true')` saat tombol *Saya Mengerti* diklik, sehingga dialog tidak terus-menerus muncul mengganggu pengguna di setiap restart/refresh.
     - Mempercantik dialog dengan dark theme konsisten (`#141722`), accent cyan & green, serta tombol aksen `#00e676`.
  3. Seluruh berkas disinkronkan ke `release/Alight-Motion-PC-win-x64/resources/app/`.

---

### 13. Auto Pengambilan Thumbnail Proyek dari Detik ke-1 (17:36)

- **Permintaan User**:
  - Auto ambil thumbnail proyek dari 1 detik (agar tidak kosong/wireframe kotak polos).
- **Implementasi**:
  1. **Thumbnail Engine Terinjeksi (`injectThumbnailEngine`)**:
     - Ditambahkan engine penangkap thumbnail otomatis di `electron/preload.js` yang mengevaluasi timeline proyek pada `t = 1.0` detik (atau durasi minimum jika proyek lebih pendek).
     - Menangkap frame WebGL `renderer.canvas` secara presisi, membuat snapshot WebP kualitas tinggi 120-160px yang mempertahankan aspect ratio proyek.
     - Menyimpan cache thumbnail ke `localStorage` dengan key `am_thumb_${projectId}` sehingga dapat dimuat seketika (instant load).
  2. **Background Processing untuk Proyek Lama**:
     - Fungsi `processMissingThumbnails()` mendeteksi proyek yang belum memiliki thumbnail di halaman utama, me-restore proyek secara non-intrusif di latar belakang pada detik ke-1, mengambil snapshot, dan mengupdate kartu proyek secara langsung tanpa mengganggu user.
     - Di-hook ke aksi editor (`#backHome`, `#saveProject`, dan `ui.saveLocal`) agar thumbnail otomatis diperbarui setiap kali proyek diedit dan disimpan.
  3. **Styling Kartu Proyek (`css/desktop.css`)**:
     - Menambahkan class `.has-thumb` pada `.projectThumb` dan elemen `<img>` `.projectThumbImg` dengan `object-fit: cover`.
     - Menyembunyikan pseudo-element wireframe kotak kosong miring (`:before`, `:after`) saat thumbnail asli telah tersedia.
  4. Berkas disinkronkan ke `release/Alight-Motion-PC-win-x64/resources/app/`.

---

### 14. Perbaikan Eksekusi Thumbnail Proyek 1.0s & Pemulihan Modal Experimental Notice (17:55)

- **Permintaan User**:
  - Thumbnail proyek di Home masih belum muncul.
  - Dialog notifikasi eksperimental hilang dan tidak muncul lagi.
- **Akar Masalah**:
  1. Variabel internal `model`, `renderer`, dan `persistentStore` berada dalam closure IIFE privat di `index.html`. Script injeksi yang memeriksa `window.persistentStore` mendapati `undefined`, menyebabkan antrean thumbnail berhenti seketika tanpa melakukan render.
  2. Dialog eksperimental dikunci secara permanen di `localStorage.setItem('am_notice_accepted', 'true')`, sehingga setiap pembukaan aplikasi berikutnya langsung menyembunyikan modal tersebut dengan `aria-hidden="true"`.
- **Implementasi Perbaikan**:
  1. **Pemulihan Dialog Notifikasi Eksperimental**:
     - Menghapus kunci permanen `localStorage.removeItem('am_notice_accepted')`.
     - Mengubah mekanisme dismiss menjadi `sessionStorage` per sesi berjalan agar modal tampil normal di awal setiap kali aplikasi dibuka.
     - Teks dialog di-rebrand secara konsisten ke **Alight Motion PC** ("Alight Motion PC masih dalam tahap eksperimen").
     - Menambahkan tombol **INFO** (`#homeAMNoticeBtn`) di top bar samping `AMHUB` dan `AMFINDER` agar user dapat membuka kembali dialog kapan saja.
  2. **Engine Thumbnail 1.0s Berdaya Tahan Tinggi**:
     - Mengakses instance inti melalui properti global yang diekspos Open Motion: `window.omsTimelinePreRender.model` dan `window.omsTimelinePreRender.renderer`.
     - Mengambil data proyek langsung dari IndexedDB `'open-motion-studio-v4'` (store `'projects'` & `'assets'`) serta `localStorage.getItem('oms4_lite_<id>')`.
     - Me-render snapshot WebGL pada `t = 1.0s` di latar belakang dan menyimpan cache WebP beresolusi tinggi di `localStorage.setItem('am_thumb_' + id, dataUrl)`.
     - Menambahkan generator fallback 2D Canvas yang menggambar warna background dan shape/text jika konteks WebGL offline.
     - Menghubungkan auto-capture pada tombol `#saveProject`, `#backHome`, dan `ui.saveLocal`.
     - Menyembunyikan wireframe cyan bawaan (`.projectThumb.has-thumb:before`, `:after`, `.projectThumbBadge`) sehingga thumbnail asli tampil bersih.
  3. **Rebuild & Sinkronisasi**:
  ---

### 15. Animasi Interaktif: Android Touch Ripple & Adaptive Micro-Press (18:30)

- **Permintaan User**:
  - Tombol masih banyak yang belum ada animasinya saat dipencet (`/grill-me`).
- **Proses Keputusan**:
  1. Dibuat laboratorium preview 4 gaya animasi di `d:\project afgan dkk\preview-animasi-tombol.html`.
  2. Pengguna menguji langsung di browser dan memilih **Gaya 3: Android Touch Ripple** dengan **Adaptive Micro-Press** di seluruh elemen interaktif aplikasi.
- **Implementasi**:
  1. **Global Event Delegation (`electron/preload.js`)**:
     - Memasang pendengar event `pointerdown` global yang mendeteksi sentuhan/klik primer pada setiap elemen interaktif (`button`, `.topIcon`, `.rightBtn`, `.projectCard`, `.homeTab`, `.fabHome`, `.transport button`, `.shapeItem`, dll.).
     - Menghitung koordinat klik relatif terhadap batas elemen (`e.clientX - rect.left`, `e.clientY - rect.top`) dan merender gelombang ripple lingkaran yang membesar dari titik sentuh kursor mouse.
     - Pewarnaan ripple bersifat adaptif: putih semi-transparan untuk tombol gelap, tinta gelap untuk tombol terang/kontras, dan aksen neon cyan/hijau untuk tombol AM khusus.
  2. **Styling Micro-Press & Ripple Wave (`css/desktop.css`)**:
     - Ditambahkan transisi elastis `scale(0.97)` saat ditekan dan pemulihan halus saat dilepas.
     - Keyframe `@keyframes amRippleWaveAnim` menganimasikan ekspansi ripple `scale(0)` ke `scale(2.8)` dan fade out secara mulus selama 520ms.
  3. **Build & Rilis**:
     - Berkas disinkronkan ke folder release dan aplikasi di-build ulang (`node scripts/build-portable.js`).
     - Aplikasi portabel Alight Motion PC dibuka kembali untuk verifikasi pengguna.


---

### 16. Animasi Modal Proyek Baru: Container Transform / Morphing Scale-Up & Reverse Shrink (18:45)

- **Permintaan User**:
  - Tombol "Proyek Baru" saat ditekan langsung memunculkan pop-up modal tanpa animasi ("tiba tiba blink gitu doang", `/grill-me`).
- **Keputusan Desain (`/grill-me`)**:
  1. **Entrance Animation**: Container Transform / Morphing Scale-Up, membesar langsung dari koordinat tombol yang diklik (`transform-origin` dinamis).
  2. **Exit Animation**: Reverse Morph / Shrink back, menyusut kembali ke koordinat tombol asal saat ditutup via tombol `×`, backdrop hitam di luar modal, maupun tombol `Escape`.
  3. **Timing & Easing**: 300ms Smooth Spring Morph (`cubic-bezier(0.34, 1.35, 0.64, 1)`) untuk entrance, 240ms (`cubic-bezier(0.4, 0, 0.2, 1)`) untuk exit.
- **Implementasi**:
  1. **Container Transform Morph Engine (`electron/preload.js`)**:
     - Menangkap koordinat klik pengguna pada phase capturing (`pointerdown`), menghitung titik tengah tombol trigger (`rect.left + rect.width / 2`, `rect.top + rect.height / 2`), dan menyimpannya di `modal._amOpenTrigger`.
     - Menggunakan `MutationObserver` untuk mendeteksi saat modal dibuka (`classList.remove('hidden')`). Menghitung relative offset titik klik terhadap kartu dialog (`.modal`), menetapkan `style.transformOrigin = '${ox}px ${oy}px'`, lalu memicu kelas `am-morph-open`.
     - Mencegat tombol tutup `#closeNew`, klik backdrop `.modalShade`, dan tombol keyboard `Escape` pada capture phase: menerapkan kelas `am-morph-close` untuk menyusutkan kembali modal ke koordinat asal selama 240ms sebelum menyetel kelas `.hidden` dan memulihkan kembali tombol FAB `#newProjectFab`.
  2. **CSS Morph & Backdrop Blur (`css/desktop.css`)**:
     - Menambahkan backdrop gelap dengan efek blur lembut (`backdrop-filter: blur(8px)`).
     - Guard perlindungan 1-frame blink (`opacity: 0` saat `.hidden` dilepas sebelum kelas animasi aktif).
     - Keyframe `@keyframes amModalMorphIn` (scale 0.15 ke 1.0 dengan overshoot spring) dan `@keyframes amModalMorphOut` (scale 1.0 ke 0.15).
  3. **Build & Verifikasi**:
     - Berkas `preload.js` dan `desktop.css` disinkronkan ke `release/Alight-Motion-PC-win-x64/resources/app/`.
     - Portable binary di-build ulang dengan `node scripts/build-portable.js`.
     - Aplikasi berjalan live dan siap diuji oleh pengguna.


---

### 17. Perbaikan Freeze Layar, Pemulihan Tombol Proyek Baru, & Universal Popup Morph Engine (18:50)

- **Masalah yang Ditemukan**:
  - Pengguna melaporkan bahwa setelah menekan tombol "Proyek Baru" lalu menekan tombol `×`, layar seperti nge-freeze dan tombol "PROYEK BARU" tidak muncul lagi di beranda.
  - Pengguna meminta agar animasi morphing ini diaplikasikan ke seluruh popup yang ada di aplikasi.
- **Akar Penyebab (*Root Cause*)**:
  1. Di `css/desktop.css`, selector `.modalShade` didefinisikan dengan `display: grid !important;`. Akibatnya, saat modal ditutup dengan kelas `.hidden` (`display: none !important`), aturan dari `desktop.css` yang diinjeksi belakangan menang di cascade CSS. Latar gelap modal (`position: fixed; inset: 0`) tetap ada dan memblokir seluruh interaksi pointer mouse pada jendela aplikasi ("ngefreeze").
  2. Karena `#newModal` dianggap masih aktif dan menutupi layer, logika Open Motion menyembunyikan tombol `#newProjectFab` (`display: none`).
- **Perbaikan yang Diterapkan**:
  1. **Strict Hidden Enforcement di CSS**:
     - `.modalShade.hidden`, `.languageModal.hidden`, `.layerActionsShade.hidden`, `#experimentalNotice[aria-hidden="true"]`, dan `.amWebModal.hidden` diwajibkan `display: none !important; pointer-events: none !important; visibility: hidden !important; opacity: 0 !important;`.
     - Tampilan `display: grid !important;` dibatasi hanya untuk `:not(.hidden)`.
     - Menambahkan aturan spesifik desktop agar `#newProjectFab` di dalam `.sectionRowActions` selalu tampil (`display: inline-flex !important; pointer-events: auto !important;`).
  2. **Universal Popup Engine (`electron/preload.js`)**:
     - Fungsi `restoreFab()` secara proaktif menghapus inline style `display: none` dan menyetel `display: inline-flex` saat `#newModal` ditutup.
     - Animasi Container Transform Morphing (Mekar dari tombol asal 280ms & Menyusut balik 220ms) kini diterapkan ke **seluruh popup aplikasi**:
       - `#newModal` (Proyek Baru)
       - `#languageModal` (Bahasa)
       - `#layerActionsShade` (Aksi Layer)
       - `#experimentalNotice` (Modal Notifikasi Eksperimental / Info)
       - `.amWebModal` (AM Finder & AM Hub in-app modal)
     - Setiap popup mendukung penutupan aman via tombol close masing-masing, klik backdrop luar, maupun tombol `Escape` tanpa risiko freeze.
  3. **Build & Rilis**:
     - Berkas disinkronkan ke direktori rilis dan portable executable diperbarui (`node scripts/build-portable.js`).
     - Aplikasi berjalan live untuk pengujian.

---

### 18. Perbaikan Total Freeze: Eliminasi Rekursi Tak Hingga MutationObserver & Verifikasi Siklus Ganda (19:15)

- **Masalah yang Dilaporkan**:
  - Setelah menekan tombol "Proyek Baru" lalu menutupnya, layar masih tetap freeze dan tidak bisa mengklik apa pun di layar beranda.
- **Investigasi Mendalam & Bukti Diagnostik**:
  - Melalui simulasi event dan tracing renderer console terungkap bahwa proses renderer Chromium mengalami **rekursi tak hingga pada MutationObserver** (tercatat 82.553 pemanggilan berulang dalam 1 detik).
  - Akar masalah: Di dalam `setupPopup`, ketika modal ditutup (`!isOpen`), `MutationObserver` memanggil `popup.classList.remove('am-morph-open', 'am-morph-close')` tanpa mengecek apakah kelas tersebut masih ada. Pemanggilan `classList.remove` pada Chromium/WebKit selalu memicu mutasi atribut `class`, yang langsung memanggil kembali callback `MutationObserver` berikutnya di microtask queue. Loop microtask tanpa henti ini memonopoli 100% thread JavaScript dan memblokir seluruh event loop (macrotask `setTimeout`, event klik mouse, dan repaint grafis).
- **Perbaikan yang Dilakukan**:
  1. **Guarded Class Manipulation di MutationObserver**:
     - `popup.classList.remove('am-morph-open', 'am-morph-close')` hanya dipanggil jika `popup.classList.contains(...)` bernilai benar. Hal ini memotong siklus mutasi dan menetralkan loop seketika.
  2. **Non-Blocking Pointer Events pada Closing State**:
     - Begitu tombol close diklik, `popup.style.pointerEvents = 'none'` segera dipasang agar overlay backdrop tidak mengonsumsi input pointer pengguna selama animasi keluar.
     - Setelah animasi 200ms selesai, `popup.classList.add('hidden')`, `popup.style.display = 'none'`, dan `popup.style.removeProperty('pointer-events')` diterapkan dengan bersih.
  3. **Penanganan Escape Terpadu**:
     - Handler tombol `Escape` dihubungkan langsung ke `activePopup._amCloseHandler?.()` sehingga transisi keluar konsisten di semua modal.
  4. **Verifikasi Otomatis Siklus Ganda**:
     - Pengujian siklus bertingkat membuktikan bahwa:
       - Modal terbuka mulus (`modalShade am-morph-open`, `display: grid`).
       - Modal tertutup mulus (`modalShade am-morph-close` -> `modalShade hidden`, `display: none`).
       - Tombol "PROYEK BARU" pulih seketika (`fabDisplay: flex`, `pointerEvents: auto`).
       - Elemen proyek di latar belakang dan tombol "PROYEK BARU" berhasil menerima hit-test kursor secara sempurna (`success: true`, exit code 0).
       - Siklus 2 (buka lagi lalu tutup lagi) bekerja 100% lancar tanpa lag atau kebocoran memori.
- **Build & Rilis**:
  - Berkas `preload.js` dan `desktop.css` disinkronkan.
  - Skrip `node scripts/build-portable.js` dijalankan: file eksekusi `release/Alight-Motion-PC-win-x64/Alight Motion PC.exe` berhasil dibangun kembali dengan bersih.

---

### 19. Pemulihan Penuh Dialog Info (Catatan Eksperimental) & Tombol INFO Top Bar (19:35)

- **Masalah yang Dilaporkan**:
  - Pengguna melaporkan bahwa dialog "info" hilang kembali ("info ny hilang lagi").
- **Akar Masalah (*Root Cause*)**:
  1. Deadlock CSS: Di `css/desktop.css`, selektor `#experimentalNotice:not([aria-hidden="true"]):not(.am-morph-open)...` menyetel `opacity: 0 !important; pointer-events: none !important;`. Karena saat startup elemen notice belum memiliki kelas `.am-morph-open`, dialog menjadi 100% transparan dan tidak bisa diklik meskipun ada di DOM.
  2. Klik tombol `INFO` (`#homeAMNoticeBtn.onclick`) sebelumnya hanya menghapus atribut `aria-hidden` tanpa memanggil `openNoticeModal`, sehingga animasi morphing dan titik pusat perbesaran tidak dijalankan.
  3. `z-index` backdrop popup di `desktop.css` disetel 100, berpotensi tertutup komponen internal yang memiliki z-index ribuan.
  4. Penutupan dialog via tombol "SAYA MENGERTI" pada capture phase belum memperbarui `sessionStorage` secara konsisten saat dialog ditutup.
- **Solusi yang Diterapkan**:
  1. **Hapus Deadlock CSS**: Menghapus aturan `opacity: 0 !important` pada `#experimentalNotice`.
  2. **Elevasi Z-Index**: Menaikkan `z-index` semua popup dan modal shade ke `100000 !important`.
  3. **Refactor & Wire `openNoticeModal`**:
     - Fungsi `openNoticeModal(triggerEl)` di `electron/preload.js` menghitung koordinat tombol trigger, menyetel `transformOrigin` pada kartu dialog, dan menambahkan kelas `.am-morph-open`.
     - Tombol top bar `#homeAMNoticeBtn` disambungkan langsung ke `openNoticeModal(noticeBtn)`.
  4. **Konsistensi Siklus Tutup di Universal Popup Engine**:
     - Pada `setupPopup`, penutupan `#experimentalNotice` otomatis menyetel `am_notice_dismissed_session` di `sessionStorage`, menandai `window.__omsExperimentalNoticeAccepted = true`, dan mendispatch event `oms:experimental-notice-accepted`.
- **Verifikasi**:
  - Skrip otomatis 6 langkah membuktikan:
    - Dialog info muncul di startup dengan `opacity: 1`, `display: grid`.
    - Tombol "SAYA MENGERTI" menyembunyikan dialog secara mulus (`display: none`, `aria-hidden: true`).
    - Tombol `INFO` membuka kembali dialog dengan origin tepat di koordinat tombol (`cardTransformOrigin: 884.773px -17.9531px`).
    - Penutupan ulang bekerja normal.
    - Modal "Proyek Baru" dan tombol "PROYEK BARU" tetap bekerja lancar tanpa freeze.
- **Build**:
  - `node scripts/build-portable.js` dijalankan dan portable executable `release/Alight-Motion-PC-win-x64/Alight Motion PC.exe` diperbarui.

---

### 20. Implementasi Fitur "Tautkan Ulang Media" Multi-Layer & Netralisasi Timeline Jump / Mouse Long-Press (20:30)

- **Masalah yang Dilaporkan User**:
  1. *"ini gaada opsi tautkan ulang?"* dan *"itu tautkan ulang gaada pas kita pilih layer banyak"* — Saat beberapa layer dipilih sekaligus (multi-select), opsi "Tautkan Ulang" (Media Relink) hilang dari layar, padahal user butuh menautkan kembali media yang hilang/terputus pada proyek.
  2. *"terus pas pencet salah satu layar malah keatas sendiri"* — Saat mengklik layer di timeline desktop, timeline tiba-tiba loncat/scroll sendiri ke paling atas (`scrollTop = 0`), track lain menghilang/kolaps, dan layer berubah menjadi mode seleksi banyak (multi-select) tanpa sengaja.
- **Akar Masalah (*Root Cause*)**:
  1. *Relink Hilang Saat Multi-Select*:
     - Open Motion bawaan hanya merender tombol relink di dalam `openInspectorRoot` saat 1 layer media dipilih. Begitu multi-select aktif, Open Motion mengganti tampilan drawer dengan `drawerShell(`${layers.length} Layer Dipilih`, ...)` yang hanya menyediakan grup/mask/hapus/sembunyi/kunci/opasitas, sama sekali tidak ada opsi relink media.
     - Selain itu, di `index.html` CSS bawaan membatasi tinggi `#drawer.multiSelectDrawer` menjadi 76px–84px di bawah layar, sehingga konten drawer multi-select terhimpit.
  2. *Timeline Loncat ke Atas & Kolaps*:
     - Bawaan Open Motion memiliki kebijakan mobile portrait `startSelectedLayerFocusSession()`. Ketika dijalankan, ini memasang kelas `.timelineArea.omsSelectedLayerFocus`, memaksa tinggi `#tracks` menjadi 29px (hanya muat 1 track), menyembunyikan semua track lain (`display: none !important`), dan memaksa `timelineScroll.scrollTop = 0`.
  3. *Klik Mouse Biasa Menjadi Multi-Select*:
     - Pada `TimelineController.prototype.layerSelectionPointerDown`, left-click mouse (`e.pointerType === 'mouse'`) tetap dipasangi timer 360ms (`selectLayerByLongPress`). Jika user menekan mouse sedikit lambat di PC (360ms), sistem menganggapnya gesture sentuh "tekan lama" ponsel, sehingga masuk mode multi-select dan mengosongkan Inspector.
- **Solusi yang Diterapkan**:
  1. **Modul Bersih `electron/desktop-engine.js`**:
     - Memisahkan seluruh injeksi client-side ke file JavaScript mandiri `electron/desktop-engine.js` untuk menghindari isu isolasi preload dan syntax string interpolation escaping.
     - Di `electron/preload.js` dan `electron/main.js`, modul `desktop-engine.js` dimuat dan dieksekusi secara otomatis ke main world DOM.
  2. **Netralisasi Timeline Jump & Focus Collapse**:
     - Pada `EditorSplitController.prototype`, metode `canStartSelectedLayerFocusSession()`, `selectedLayerFocusEligible()`, dan `startSelectedLayerFocusSession()` dinetralisir agar mengembalikan `false` dan membersihkan focus session.
     - Pada `EditorSplitLayoutPolicy.prototype`, `automaticFocusEligible()` dan `focusSessionEligible()` disetel `() => false`.
     - Ditambahkan heartbeat pencegah dan CSS override di `css/desktop.css`: `.timelineArea.omsSelectedLayerFocus #tracks { height: auto !important; }` dan `#tracks .track { display: grid !important; }`.
  3. **Proteksi Klik Mouse (Anti-Accidental Multi-Select)**:
     - `TimelineController.prototype.layerSelectionPointerDown` diproteksi: jika `e.pointerType === 'mouse'` dan user TIDAK menekan tombol modifikasi (`Ctrl`, `Meta`, `Shift`), timer long-press 360ms dibatalkan. Klik biasa hanya melakukan seleksi normal layer.
     - `UIController.prototype.selectLayerByLongPress` diproteksi: diabaikan jika event berasal dari pointer mouse tanpa tombol modifikasi.
  4. **Kartu "Tautkan Ulang Media" di Multi-Select Drawer (`#drawer.multiSelectDrawer`)**:
     - Di `css/desktop.css`: `#drawer.multiSelectDrawer` di-dock di sisi kanan desktop selebar 400px dengan tinggi penuh yang fleksibel dan scrollable.
     - Saat multi-select aktif, kartu `.amMultiRelinkCard` dirender ke dalam `.multiSelectBody`:
       - Mendeteksi seluruh layer bertipe media (`image`, `video`, `audio`) yang terpilih.
       - Badge status otomatis menandai media yang sumbernya hilang (`⚠ N Perlu Ditautkan`) atau terdeteksi.
       - Tombol per-media "Tautkan" / "Ganti" langsung memanggil `window.openMediaRelinkMenu(layer)` bawaan Open Motion.
       - Tombol "↻ Cari Otomatis Semua Media" (`#amRelinkAutoAllBtn`) untuk pemulihan otomatis satu klik.
       - Tombol aksi "✕ Batalkan Pilihan ({N} Layer)" (`#amMultiCancelBtn`) yang memanggil `ui.finishLayerMultiSelection({ announce: true })`.
       - Shortcut global tombol `Escape` untuk keluar dari multi-select kapan saja.
- **Verifikasi**:
  - Diuji secara otomatis dengan headless runner Electron:
    - `engineScriptInjected: true`
    - `inEditor: true`
    - `focusSessionDisarmed: true`
    - `mouseLongPressDisarmed: true`
    - `multiSelectDrawer.drawerWidth: '400px'`
    - `relinkWrapExists: true`
    - `cancelBtnExists: true`
    - `mediaButtonsCount: 1`
    - `afterCancel.multiSelectMode: false` dan `selectedCount: 0`.
- **Rilis**:
  - Seluruh berkas yang dimodifikasi (`css/desktop.css`, `electron/preload.js`, `electron/desktop-engine.js`, `electron/main.js`) telah disinkronkan ke bundle aplikasi `release/Alight-Motion-PC-win-x64/resources/app/`.
  - Berkas `index.html` tetap 100% identik dengan upstream hash `8816e9f9b03ce058e1543f136e17fabff0a89093`.


