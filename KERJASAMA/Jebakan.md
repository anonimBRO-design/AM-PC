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
