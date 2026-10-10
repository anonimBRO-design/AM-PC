# Handoff — State Terkini

> **File ini DITIMPA, bukan ditambahi.** Selalu cerminkan kondisi terkini.
> Terakhir diperbarui: 10 Okt 2026 · oleh: Antigravity

Bagian dari [[README|protokol kerja bersama]].
Aturan kerja: [[Aturan]] · Jebakan: [[Jebakan]] · Fakta: [[Fakta]]

---

## Sedang apa

**Idle.** Masalah tautkan ulang media pada multi-selection ("itu tautkan ulang gaada pas kita pilih layer banyak") dan loncatan timeline/kolaps track ("pas pencet salah satu layar malah keatas sendiri") telah diperbaiki secara tuntas. Kini saat memilih banyak layer, drawer kanan menampilkan kartu "Tautkan Ulang Media" lengkap dengan daftar media, tombol relink per-media, tombol cari otomatis, dan tombol batalkan pilihan. Klik mouse pada timeline kini stabil tanpa loncat ke atas atau salah masuk mode multi-select.

| Agent | Status |
|---|---|
| **Antigravity** | Selesai — Implementasi Multi-Select Media Relinker, netralisasi timeline focus session jump, proteksi mouse click long-press, build & rilis terverifikasi |
| **Claude Code** | Selesai — audit, verifikasi, buat sistem kerja sama |

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
| Multi-Select Relink | ✅ **Tautkan Ulang Media** hadir di drawer kanan saat multi-select layer, per-media link button, batch auto-relink, dan tombol "Batalkan Pilihan" |
| Timeline Stability | ✅ **Anti-Jump & Anti-Focus Collapse** aktif (klik layer tidak lagi loncat ke atas atau mengkolaps track lain ke 29px) |
| Mouse Selection | ✅ **Anti-LongPress Mouse** aktif (klik biasa mouse tidak memicu timer 360ms multi-select sentuh ponsel) |
| CSS Desktop | ✅ Aktif disuntikkan via Electron `insertCSS` (lihat [[Fakta]] F-03) |
| Inspector Dock | ✅ Docked rapi di panel kanan atas 400px, 2-kolom compact |
| Build `.exe` | ✅ Ada di `release/Alight-Motion-PC-win-x64/` (file release tersinkronisasi) |
| Aplikasi | ✅ Berjalan normal di desktop |
| Repo | `anonimBRO-design/AM-PC` |

---

## Yang sudah dikerjakan

### Antigravity (10 Okt 2026 - Bagian 9: Pemulihan Dialog Info & Tombol INFO Top Bar)

- **Akar Masalah Hilangnya Info**:
  - Ditemukan aturan deadlock di `css/desktop.css` yang memaksa `#experimentalNotice` menjadi `opacity: 0 !important; pointer-events: none !important;` jika kelas `.am-morph-open` belum terpasang. Karena pada pemuatan awal elemen notice belum diberi kelas tersebut oleh MutationObserver, dialog secara fisik ada di DOM tetapi 100% kasat mata (transparan).
  - Tombol `#homeAMNoticeBtn` pada top bar hanya menghapus `aria-hidden` tanpa memanggil `openNoticeModal`, sehingga tidak memicu animasi mekar maupun penentuan titik koordinat asal.
  - Nilai `z-index` modal shades di `desktop.css` sempat hanya bernilai 100, berisiko tertutup komponen editor seperti `#drawer` (`z-index: 9999`).
- **Perbaikan yang Dilakukan**:
  1. Menghapus aturan `opacity: 0 !important` pemblokir pada `#experimentalNotice`.
  2. Menaikkan `z-index` seluruh modal shades dan `#experimentalNotice` menjadi `100000 !important`.
  3. Memperbaiki fungsi `openNoticeModal(triggerEl)` di `electron/preload.js` untuk secara dinamis mengambil titik tengah trigger (baik dari tombol `INFO` maupun tengah viewport), menyetel `transformOrigin` kartu notifikasi, membersihkan inline style `display`, dan memicu kelas `.am-morph-open`.
  4. Menghubungkan tombol `INFO` pada top bar beranda (`#homeAMNoticeBtn.onclick = () => openNoticeModal(noticeBtn)`).
  5. Memastikan siklus penutupan notice di `setupPopup` mencatat `am_notice_dismissed_session` di `sessionStorage` dan mendispatch event `oms:experimental-notice-accepted`.
- **Verifikasi Komprehensif**:
  - Berhasil diuji melalui 6 tahap otomatis: startup muncul mulus (`opacity: 1`, `display: grid`), dismiss menyusut dan tersembunyi (`display: none`, `aria-hidden: true`), klik tombol `INFO` mekar kembali dari koordinat tombol `INFO`, dismiss ulang aman, dan modal "Proyek Baru" tetap terbuka/tutup tanpa freeze.
- **Sinkronisasi & Rebuild**:
  - `node scripts/build-portable.js` dijalankan: portable executable di `release/Alight-Motion-PC-win-x64/Alight Motion PC.exe` berhasil diperbarui.

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
