# Jebakan

Hal yang sudah pernah bikin rugi di proyek ini. **Baca sebelum mengubah kode.**
Tambahkan entri baru di bawah, **jangan hapus yang lama.**

Bagian dari [[README|protokol kerja bersama]].
Aturan: [[Aturan]] · Fakta: [[Fakta]] · State: [[Handoff]]

---

## 1. Menyimpulkan "ketinggalan" dari git log

**Gejala:** Niat mau sync ulang, padahal isinya sudah sama. Kalau dieksekusi,
kerjaan agent lain bisa tertimpa.

**Kejadian:** 9 Oktober 2026, Claude Code.

```
$ git log --oneline HEAD..upstream/main
85e5555 New feature        ← muncul, kelihatan seperti "belum diambil"
```

Claude Code menyimpulkan *"fork ketinggalan 11.381 baris, harus sync"*.

**Kenyataannya:** isinya sudah sama.

```
$ git rev-parse HEAD:index.html
8816e9f9b03ce058e1543f136e17fabff0a89093

$ git rev-parse upstream/main:index.html
8816e9f9b03ce058e1543f136e17fabff0a89093        ← IDENTIK
```

**Sebab:** `HEAD..upstream/main` menunjukkan **commit yang belum ada di riwayat**,
bukan **isi file yang berbeda**. Dua hal berbeda.

Antigravity sudah mengambil isi commit itu, tapi dengan cara yang membuat
riwayat git-nya berbeda (misal `cherry-pick` atau `checkout` file).

**Perbaikan:** Selalu cek **hash file**, bukan git log.

```bash
# BENAR
git rev-parse HEAD:index.html
git rev-parse upstream/main:index.html

# SALAH — menyesatkan
git log HEAD..upstream/main
```

**Cara memverifikasi:** kalau dua hash sama, file **identik**. Titik.
Jangan pedulikan apa kata git log.

---

## 2. Dua agent bikin file dengan nama berbeda

**Gejala:** File yang dirujuk tidak ada → error 404. Padahal dua-duanya
"mengerjakan hal yang sama".

**Kejadian:** Proyek Web Kelas X 1.

| Agent | Nama file |
|---|---|
| Claude Code | `plusjakarta-normal.woff2` |
| Antigravity | `jakarta.woff2` |

Yang ter-deploy merujuk `jakarta.woff2` — **file itu tidak pernah ada**.
Hasilnya: font gagal dimuat, pengunjung lihat font sistem biasa.

**Sebab:** tidak ada daftar pemilik file. Dua agent bebas membuat file
yang fungsinya sama, dengan nama berbeda.

**Perbaikan:** tabel pemilik di [[Aturan]] §2. Satu file, satu pemilik.

**Pelajaran tambahan:** kalau dua agent mengerjakan hal yang sama,
**yang menang adalah yang terakhir publish** — dan belum tentu itu yang benar.

---

## 3. Mengira struktur folder sebagai "sampah"

**Gejala:** Niat "merapikan" folder, malah merusak keputusan yang disengaja.

**Kejadian:** 9 Oktober 2026, Claude Code.

Claude Code melihat folder `css/` dan `electron/`, lalu berpikir:
*"Ini sisa versi lama, tidak dipakai, bisa dihapus."*

**Kenyataannya:** itu **pemisahan yang sengaja**. Antigravity menaruh
modif di luar `index.html` supaya upgrade ke depan tidak merusak apa pun.

**Sebab:** tidak ada catatan **kenapa** struktur dibuat begitu.

**Perbaikan:** kalau menemukan struktur aneh, **tanya dulu** atau cari
catatannya. Jangan langsung "rapikan".

**Aturan umum:** "aneh" bukan berarti "salah". Bisa jadi itu keputusan
yang belum kamu pahami.

---

## 4. CSS yang ditulis tapi tidak dimuat

**Gejala:** Edit file CSS, tidak ada efek apa pun di tampilan.

**Kejadian:** `css/desktop.css` (1.702 baris) dan `css/theme.css`
(1.144 baris) — total **2.846 baris** — tidak pernah dimuat.

**Sebab:** `index.html` tidak merujuknya (0 kali), dan
`electron/main.js` cuma `loadFile('index.html')` tanpa `insertCSS`.

**Perbaikan:** kalau CSS tidak berefek, cek dulu apakah file itu
**benar-benar dimuat**:

```bash
grep -c "desktop.css" index.html     # 0 = tidak dirujuk
```

**Pelajaran:** menulis kode ≠ kode itu jalan. Verifikasi pemuatannya.

---

## 5. Bilang "kacau balau" tanpa menyebut bagian mana

**Gejala:** Agent menghabiskan waktu mencari masalah yang tidak jelas.

**Kejadian:** 9 Oktober 2026. User bilang hasilnya *"kacau balau"*.

Claude Code lalu mengaudit seluruh proyek — ternyata aplikasinya
**jalan normal**. Splash screen tampil rapi, `.exe` berisi versi terbaru.

**Sebab:** keluhan tanpa detail. "Kacau" bisa berarti:
- Tampilan rusak?
- Fitur tidak jalan?
- Susah dipakai?
- Ada error?

**Perbaikan:** kalau melaporkan masalah, sebutkan:

| Yang dibutuhkan | Contoh |
|---|---|
| **Di mana** | "di halaman editor", "waktu buka file" |
| **Apa yang terjadi** | "tombolnya tidak muncul" |
| **Harapannya** | "harusnya ada tombol simpan" |
| **Screenshot** | kalau bisa |

**Untuk agent:** kalau keluhan tidak jelas, **tanya dulu**. Jangan audit
seluruh proyek berdasarkan tebakan — itu buang waktu dan bisa salah sasaran.

---

## 6. `git add -A` menyapu kerjaan agent lain

**Gejala:** Commit berisi file yang bukan milikmu.

**Sebab:** `git add -A` menambahkan **semua** perubahan di working tree,
termasuk yang sedang ditulis agent lain.

**Perbaikan:** tambahkan file secara eksplisit.

```bash
git add index.html         # benar
git add KERJASAMA/         # benar

git add -A                 # SALAH
git add .                  # SALAH
```

**Kalau sudah terlanjur:** biasanya kode yang tersapu masih valid,
tapi agent lain kehilangan kendali atas commit-nya. Beri tahu lewat
[[Handoff]] dan sepakati pembagian file.

---

## 7. Aturan CSS `!important` menimpa utilitas `.hidden`

**Gejala:** Layar editor atau drawer muncul menumpuk di atas layar Home, atau elemen tersembunyi bocor ke tampilan.

**Kejadian:** 10 Oktober 2026, Antigravity.

**Sebab:** Ketika file CSS kustom disuntikkan belakangan dan memiliki deklarasi seperti:
```css
.editor {
  display: grid !important;
}
```
Maka ketika elemen memiliki class ganda `<section class="editor hidden">`, aturan `.editor` yang dimuat belakangan dengan `!important` mengalahkan `.hidden { display: none !important; }` bawaan `index.html`.

**Perbaikan:**
1. Gunakan selektor spesifik status: `.editor:not(.hidden)`
2. Selalu sertakan penegasan mutlak di akhir file CSS kustom:
```css
.hidden, [hidden], .editor.hidden, .home.hidden {
  display: none !important;
}
```
3. Pastikan `@import` font diletakkan di baris paling atas CSS, karena engine web mengabaikan `@import` jika ditaruh di bawah rules lain.

**Cara memverifikasi:** Buka aplikasi, pastikan di layar Home tidak ada elemen editor yang bocor atau menumpuk.

---

## 8. Mengasumsikan variabel inti Open Motion ada di `window`

**Gejala:** Thumbnail kartu proyek di Home tidak pernah terbuat / blank, script thumbnail generator langsung berhenti, atau notice hilang selamanya.

**Kejadian:** 10 Oktober 2026, Antigravity.

**Sebab:** 
1. Di `index.html`, kode aplikasi dibungkus IIFE raksasa `(() => { ... })()`. Variabel `model`, `renderer`, dan `persistentStore` dideklarasikan dengan `const`, bukan properti `window`. Pengecekan `if (!window.persistentStore) break;` langsung menghentikan antrean rendering thumbnail seketika.
2. Menyimpan status notice `am_notice_accepted` ke `localStorage` menyebabkan modal `#experimentalNotice` hilang permanen selamanya pada setiap pembukaan aplikasi berikutnya.

**Perbaikan:**
1. Jangan mencari `window.model` atau `window.persistentStore` mentah-mentah.
2. Akses engine via referensi resmi yang diekspos ke `window`:
   - `model`: `window.omsTimelinePreRender?.model`
   - `renderer`: `window.omsTimelinePreRender?.renderer`
   - `timeline`: `window.omsTimelinePreRender?.timeline`
   - `ui`: `window.omsAppBackRouter?.ui`
3. Ambil data proyek langsung via API browser standar `indexedDB.open('open-motion-studio-v4', 1)` pada object store `'projects'` atau fallback `localStorage.getItem('oms4_lite_' + id)`.
4. Untuk dialog notice, jangan kunci di `localStorage`; gunakan `sessionStorage` agar tetap tampil pada awal pembukaan aplikasi, dan sediakan tombol `INFO` pada header untuk membuka ulang kapan saja.

**Cara memverifikasi:**
Buka aplikasi, pastikan modal "Alight Motion PC masih dalam tahap eksperimen" muncul di awal, dan kartu proyek di Home langsung memiliki thumbnail asli yang dicomot dari detik ke-1.0s.

---

## 9. Rekursi tak hingga MutationObserver akibat pemanggilan `classList.remove` tanpa pengecekan

**Gejala:** Setelah modal ditutup (`#newModal` atau popup lainnya), seluruh aplikasi mendadak membeku ("ngefreeze"), kursor tidak bisa mengklik apa pun di layar, dan penggunaan memori melonjak hingga bergiga-giga bytes.

**Kejadian:** 10 Oktober 2026, Antigravity.

**Sebab:**
Dalam `MutationObserver` yang memantau perubahan atribut `class` pada elemen popup:
```javascript
} else if (!isOpen) {
  popup.classList.remove('am-morph-open', 'am-morph-close');
  popup.style.display = 'none';
}
```
Di Chromium/WebKit, pemanggilan `classList.remove('...')` mentrigger mutasi atribut `class` pada DOM element. Jika pemanggilan tersebut dieksekusi tanpa memeriksa apakah kelas tersebut benar-benar ada di `classList`:
1. `classList.remove` dipanggil.
2. `MutationObserver` menerima mutasi atribut `class` dan memasukkan callback ke antrean microtask.
3. Callback berjalan, mendapati status `!isOpen`, lalu memanggil `classList.remove` lagi.
4. Terjadi rekursi tak hingga (tercatat lebih dari 82.500 mutasi dalam hitungan detik) yang memonopoli thread JavaScript utama dan mencegah macrotask/event loop browser memproses klik mouse maupun rendering tampilan.

**Perbaikan:**
1. Selalu periksa keberadaan class sebelum memanggil manipulasi:
```javascript
if (popup.classList.contains('am-morph-open') || popup.classList.contains('am-morph-close')) {
  popup.classList.remove('am-morph-open', 'am-morph-close');
}
```
2. Pastikan backdrop shade yang ditutup segera diberi `pointer-events: none` agar tidak menghalangi klik pada elemen di bawahnya selama maupun sesudah animasi exit.

**Cara memverifikasi:**
Buka modal "Proyek Baru", klik tombol close `×` berulang-ulang dalam beberapa siklus. Aplikasi tetap responsif, tombol "PROYEK BARU" tetap dapat diklik, dan thread event loop berjalan lancar tanpa spike memori/mutasi.

---

## 10. `require('fs')` atau `require('path')` di dalam `preload.js` saat sandbox aktif

**Gejala:** Preload script gagal dimuat sama sekali (`Unable to load preload script: Error: module not found: fs`). Seluruh bridge desktop dan styling di preload mati total.

**Kejadian:** 10 Oktober 2026, Antigravity.

**Sebab:**
Dalam Electron, jika `sandbox: false` belum disetel pada `webPreferences` (default adalah sandboxed saat `nodeIntegration: false`), modul inti Node seperti `fs` dan `path` dilarang di-require di dalam `preload.js`. Hanya modul bawaan `electron` yang tersedia di renderer sandboxed.

**Perbaikan:**
1. Pastikan `sandbox: false` disetel di `webPreferences` pada `electron/main.js`.
2. Jangan mengandalkan file reading runtime kompleks jika bisa diinjeksikan langsung atau dipisah ke modul script terpisah yang dieksekusi di main world.

**Cara memverifikasi:**
Jalankan browser window Electron dengan mendengarkan `console-message`. Pastikan tidak ada pesan merah `Unable to load preload script: Error: module not found: fs`.

---

## 11. Kesalahan interpolasi template literal bersarang saat injeksi kode ke DOM

**Gejala:** Script yang diinjeksi via `script.textContent = \`(${function() { ... }.toString()})()\`` mengalami `ReferenceError` atau syntax error di runtime.

**Kejadian:** 10 Oktober 2026, Antigravity.

**Sebab:**
Ketika fungsi pembungkus diubah ke string di dalam template literal Node:
```javascript
script.textContent = `
  (${function() {
     const html = `<div class="${isMissing ? 'a' : 'b'}">...</div>`;
  }.toString()})();
`;
```
Ekspresi `${isMissing ? ...}` dievaluasi oleh engine Node pada saat pembentukan string di preload (di mana variabel `isMissing` belum ada), bukan saat dieksekusi di browser renderer.

**Perbaikan:**
Pisahkan script client browser ke file mandiri (seperti `electron/desktop-engine.js`), lalu baca isinya dengan `fs.readFileSync` atau suntikkan via `mainWindow.webContents.executeJavaScript`. Ini menghindari escaping syntax dan membuat kode memiliki syntax highlighting utuh.

**Cara memverifikasi:**
Suntikkan script dan periksa apakah `window.__amDesktopEngineInitialized` bernilai true dan script dieksekusi tanpa syntax error di console browser.

---

## 12. Param XML duplikat & tag param langka bikin shader fail senyap (AM-Native-Desktop)

**Gejala:** 107 dari 269 shader gagal compile di batch test WebGL2 (`npm run verify:shaders`); error didominasi "redefinition" (uniform) & "undeclared identifier"; param efek (mis. warna hue/tint) hilang dari UI.
**Kejadian:** 11 Okt 2026, ditemukan Hermes saat membuat batch test.
**Sebab:** Dua bug di parser param `AM-Native-Desktop/scripts/bundle-effects.js`: (1) regex tag tidak mencakup `choice` (790×), `hue-disc` (13×), `float` (3×) → uniform tidak dideklarasikan; (2) XML yang sama mendeklarasikan id param dua kali (slider + spinner, 18 efek) → pipeline menulis `uniform float X;` dobel → "redefinition".
**Perbaikan:** lengkapi tag→tipe GLSL (`choice→float`, `hue-disc→color`) + dedupe by id (pertahankan kemunculan pertama). Pack AM-PC (release) sudah tanpa duplikat — samakan.
**Cara memverifikasi:** `npm run verify:shaders` → pass-rate naik 148→162/269; `colorhot` punya param `color`,`tint`; `brightcont` tidak ada id dobel.

---

## 13. Format warna hex Android `#AARRGGBB` vs Web `#RRGGBBAA` (AM-Native-Desktop)

**Gejala:** Kanvas proyek Alight Motion yang diimpor dari XML tertutup warna pink/salmon solid satu layar penuh. Proyek dengan 52 layer tidak menampilkan gambar apa pun selain warna salmon solid.
**Kejadian:** 11 Okt 2026, Antigravity.
**Sebab:** Alight Motion di Android mengekspor warna 8-digit dalam format Android Color Int `#AARRGGBB` (2 digit pertama adalah Alpha). Fungsi `parseHexColor()` lama menganggapnya sebagai format CSS/Web `#RRGGBBAA` (`(num >> 24)` diambil sebagai Red). Akibatnya, `#ff000000` (hitam pekat, Alpha=0xFF) dibaca sebagai Red=1.0, Green=0, Blue=0, Alpha=0.
**Perbaikan:** Di `src/engine/webgl2-renderer.ts`, parsing hex 8-digit diubah agar membaca `str.slice(0, 2)` sebagai Alpha, `str.slice(2, 4)` sebagai Red, `str.slice(4, 6)` sebagai Green, dan `str.slice(6, 8)` sebagai Blue.
**Cara memverifikasi:** Proyek Alight Motion dengan `#ff000000` atau `#ffffffff` terbaca akurat `[0, 0, 0, 1.0]` dan `[1, 1, 1, 1.0]`.

---

## 14. Pemanggilan `gl.clear` satu layar penuh pada `renderBaseLayerContent` di WebGL FBO

**Gejala:** Setiap layer menimpa seluruh viewport kanvas dengan warna solid (atau latar belakang default hijau toska `[0.0, 0.9, 0.5, 1.0]`), sehingga hanya layer paling atas yang terlihat menutupi seluruh layar.
**Kejadian:** 11 Okt 2026, Antigravity.
**Sebab:** `renderBaseLayerContent` lama melakukan `gl.clearColor(...)` dan `gl.clear(gl.COLOR_BUFFER_BIT)` langsung ke buffer ping FBO. Buffer ping seharusnya dibersihkan transparan `(0, 0, 0, 0)` di awal render layer, lalu konten layer (shape/media) digambar sebagai quad bertransformasi (`uMatrix`) yang dibatasi ukuran dan koordinat lokal layer tersebut.
**Perbaikan:** Hapus `gl.clear` dari `renderBaseLayerContent`. Buat program `layerProgram` yang menerima `uMatrix` (mat4 proyeksi orthographic 2D + model matrix: posisi, skala, rotasi, ukuran), lalu panggil `shaderPipeline.drawQuad()`.
**Cara memverifikasi:** Kanvas menampilkan layer dengan batas ukuran dan posisinya masing-masing, area di luar layer tetap transparan atau menampilkan layer di bawahnya.

---

## 15. Blob URL `URL.createObjectURL` disimpan ke data proyek — mati saat aplikasi ditutup (AM-Native-Desktop)

**Gejala:** media (foto/audio/video) yang tadinya tampil normal hilang setelah aplikasi ditutup dan dibuka lagi; renderer menampilkan placeholder abu-abu; konsol `Failed to fetch` untuk `blob:file:///...`.

**Kejadian:** 2026-10-11, proyek "Negoro angin" (AM Link) di AM-Native-Desktop — 17 media `blob:` mati setelah restart. Ditemukan saat melanjutkan sesi Antigravity yang macet.

**Sebab:** `am-link.ts` menyimpan `URL.createObjectURL(blob)` langsung ke `layer.mediaSrc` yang ikut tersimpan di localStorage. Blob URL hanya hidup selama sesi renderer yang membuatnya.

**Perbaikan:** media ditulis ke disk (`userData/am_media/<sha1>.<ext>`) dan dipakai lewat skema `ammedia://` (protocol handler Electron, `electron/am-media.js`). Blob URL hanya fallback.

**Cara memverifikasi:** `npx electron scripts/verify-text-media.js` lalu `--phase2` (restart) — FASE1 & FASE2 PASS dengan piksel identik; `mediaSrc` proyek tersimpan `ammedia://media/<sha1>.png`.

---

## 16. Layer `<text>` tanpa jalur render = quad fallback abu-abu menutupi seluruh kanvas (AM-Native-Desktop)

**Gejala:** render "cuma grey" walau audio jalan; seluruh kanvas `RGBA(31,36,46,255)`; media di bawahnya tidak terlihat.

**Kejadian:** 2026-10-11, proyek "Negoro angin" — dua layer text 1080×1920 tanpa fillColor.

**Sebab:** `webgl2-renderer.ts` tidak punya cabang untuk `type === 'text'` → jatuh ke fallback `[0.12,0.14,0.18]` opaque. Bukti: `scripts/diag-grey2.js` → greyPct=100%, 9/9 sampel sama persis.

**Perbaikan:** `src/engine/text-renderer.ts` (canvas2d → texImage2D) + parser mengekstrak properti text; teks kosong dilewati (tidak digambar).

**Cara memverifikasi:** `verify-text-media.js` — glyph "T" putih terdeteksi (top > bottom), greyPct=0.

---

## 17. `inputImg` di-chain per pass — efek multi-pass membunuh konten jadi hitam (AM-Native-Desktop)

**Gejala:** semua layer yang punya efek tampil HITAM OPAK (0,0,0,255); layer tanpa efek normal.
**Kejadian:** proyek "Negoro angin" hasil impor ulang — kanvas hitam total.
**Sebab:** `applyEffectPasses` meng-update `curIn` ke output pass sebelumnya. Model AM: `inputImg`/`content` = input **asli** efek di **semua** pass; buffer antar-pass dibaca eksplisit via param (`downImg`/`hblur`/`vblur`). Fallback `gaussianblur` saat `strength<=0` (`texture2DCv(inputImg.texture, ...)`) jadi membaca buffer kosong → (0,0,0,0).
**Perbaikan:** jangan chain `curIn` per pass (selalu = input asli efek).
**Cara memverifikasi:** probe `readPixels` per-pass — pass0 copy ✓ (55,49,49); pass1 hblur dulu (0,0,0,0) → sesudah fix semua pass lolos konten.

---

## 18. Param `srcType:"comp"` (lift/copybg) diikat buffer kosong (AM-Native-Desktop)

**Gejala:** efek `lift` (copybg) menghasilkan hitam di layer transisi full-frame (shape 541×1.99=1080 / 200×9.6=1920).
**Sebab:** `lift` = Copy Background — shader `mix(texture2DCv(comp.texture,...) * texColor.a, texColor, fill)` butuh `comp` = komposit kanvas **di bawah** layer; kode mengikat buffer kosong.
**Perbaikan:** salin komposit kanvas ke `_compScene` (`copyTexImage2D` dari FBO null) sebelum loop efek; binding tekstur mengikuti `srcType` (content→input asli, comp→compScene, buffer→buf_<id>).
**Cara memverifikasi:** `[dbg-chain]` Layer 23 #lift px=55,49,49 (foto) — bukan hitam.

---

## 19. Spam tombol panah (seek) → GPU process crash `exit_code=34` (AM-Native-Desktop)

**Gejala:** setelah ~420 dispatch ArrowLeft/ArrowRight berturut-turut di skrip headless: `GPU process exited unexpectedly: exit_code=34` → context lost → semua piksel nol (seolah bug render).
**Sebab:** seek bertubi-tubi membanjiri GPU process; context WebGL hilang.
**Perbaikan:** hook `__amDebugSeek(t)` di `studio-ui.ts` (seek langsung via renderer) + `scratch/preview-negoro10.js`. Hindari spam event keyboard.
**Cara memverifikasi:** `CTX-LOST: 0` di log run; nilai balik seek = nilai yang diminta.

---

## 20. Kolom label timeline flex-shrink mengompres baris → label melenceng dari klip (AM-Native-Desktop)

**Gejala:** baris label T1–T12 (~17px/baris) tidak sejajar dengan bar klip (~38px pitch); makin ke bawah makin geser (bar ke-5 melenceng ~5 baris). Playhead tetap benar.
**Kejadian:** proyek 30 layer ("Negoro angin") — tampak di screenshot user.
**Sebab:** `.track-headers` = `display:flex; flex-direction:column` **tanpa overflow handling**. Konten 30×38px = 1140px di container ~186px → default `flex-shrink:1` mengompres tiap `.track-header-item` ke min-content (~17px). `.timeline-track-row` di `#trackScroller` = block flow biasa → tetap 38px. Pitch beda → drift.
**Perbaikan:** `flex-shrink:0` + `overflow-y:auto` (scrollbar disembunyikan) di kolom label; `.tracks-canvas-area` `overflow-y:auto`; `#trackScroller` `min-height:100%` (playhead setinggi konten); sinkron scroll dua arah label ↔ klip di `bindEvents`.
**Cara memverifikasi:** `scratch/measure-timeline.js` — pitch 38/38px, `misalign [0,0,0,0,0,0]`, scroll sinkron 120→120 & 40→40, `misalignAfter=0`. Commit `e5ed4ff`.

---

## Cara menambah jebakan baru

Kalau kamu menemukan hal yang bikin rugi, tambahkan di sini dengan format:

```markdown
## N. Judul singkat

**Gejala:** apa yang terlihat
**Kejadian:** kapan, siapa
**Sebab:** kenapa terjadi
**Perbaikan:** apa yang harus dilakukan
**Cara memverifikasi:** bagaimana memastikan sudah benar
```

**Aturan:** sertakan **bukti** (perintah, output, atau angka).
Jebakan tanpa bukti cuma jadi gosip.
