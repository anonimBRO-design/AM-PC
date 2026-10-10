# AM-PC — Aturan Proyek

Fork dari [Hada45/Open-Motion](https://github.com/Hada45/Open-Motion),
dibungkus jadi aplikasi desktop Windows (Electron + portable `.exe`).

---

## WAJIB BACA SEBELUM MULAI

Folder **`KERJASAMA/`** berisi memori bersama antar-agent.
**Baca dulu sebelum mengubah apa pun:**

| File | Kapan dibaca |
|---|---|
| `KERJASAMA/Handoff.md` | **Selalu, sebelum mulai** |
| `KERJASAMA/Jebakan.md` | **Selalu, sebelum ubah kode** |
| `KERJASAMA/Fakta.md` | **Selalu, sebelum menyimpulkan** |
| `KERJASAMA/Aturan.md` | Sekali di awal (aturan kerja) |

**Kenapa:** agent AI tidak punya memori bersama. Sudah dua kali kerjaan
rusak karena tidak ada catatan. Folder itu yang menutup celahnya.

---

## 3 aturan terpenting

### 1. `index.html` sudah versi terbaru — jangan sync ulang

Sudah diverifikasi 9 Okt 2026. Hash-nya identik dengan upstream.

```bash
# Cek dulu sebelum percaya apa pun:
git rev-parse HEAD:index.html
git rev-parse upstream/main:index.html
# Kalau SAMA -> berhenti. Tidak perlu sync.
```

**Jangan** menyimpulkan dari `git log HEAD..upstream/main` — itu
menunjukkan **riwayat**, bukan **isi file**. Lihat `KERJASAMA/Jebakan.md` §1.

### 2. Jangan edit `index.html` langsung

Kalau perlu menambah sesuatu, taruh di **file terpisah**
(`css/`, `electron/`, atau file baru). Alasannya: `index.html` 3.2 MB
satu file — kalau diedit, upgrade berikutnya bikin modifmu hilang.

Antigravity sudah menerapkan pola ini. Ikuti, jangan diubah.

### 3. Cek pemilik file dulu

| File / folder | Pemilik |
|---|---|
| `index.html` | **upstream** — jangan diedit |
| `electron/`, `scripts/`, `css/`, `icons/`, `README.md` | **Antigravity** |
| `KERJASAMA/` | **semua** — boleh dibaca siapa saja |

Kalau perlu mengubah file milik agent lain, **tulis dulu di
`KERJASAMA/Handoff.md`** dan tunggu sampai dia tidak aktif.

---

## Setelah selesai kerja

1. Tulis log di `KERJASAMA/Log/YYYY-MM-DD <agent>.md`
2. Perbarui `KERJASAMA/Handoff.md` kalau state berubah
3. Tambahkan ke `KERJASAMA/Jebakan.md` kalau menemukan hal yang bikin rugi
4. Tambahkan ke `KERJASAMA/Fakta.md` kalau menemukan fakta baru **+ buktinya**

**Tulis yang gagal juga**, bukan cuma yang berhasil.

---

## Struktur proyek

| File / folder | Isi |
|---|---|
| `index.html` | **Seluruh aplikasi** (HTML+CSS+JS, 3.2 MB, 1 file) |
| `electron/main.js` | Pembungkus desktop |
| `electron/preload.js` | Jembatan aman ke Electron |
| `scripts/build-portable.js` | Skrip build `.exe` |
| `css/` | CSS tambahan — **saat ini tidak dimuat** |
| `icons/` | Ikon aplikasi |
| `manifest.webmanifest` | Manifest PWA |
| `release/` | Hasil build — di-`.gitignore` |
| `KERJASAMA/` | Memori bersama agent |

---

## Perintah

```bash
# Jalankan versi desktop (butuh Node + Electron)
npm start

# Build portable .exe
node scripts/build-portable.js

# Cek versi upstream (JANGAN langsung sync)
git fetch upstream
git rev-parse HEAD:index.html
git rev-parse upstream/main:index.html
```

---

## Bahasa

**Bahasa Indonesia** untuk dokumentasi dan komentar kode.

---

## Jangan

- ❌ Edit `index.html` langsung
- ❌ Sync ulang tanpa cek hash
- ❌ Pakai `git add -A` (menyapu kerjaan agent lain)
- ❌ "Merapikan" struktur tanpa baca catatannya dulu
- ❌ Bilang "selesai" tanpa bukti

---

## Kalau ragu

Baca `KERJASAMA/README.md` — penjelasan lengkap protokolnya.
Atau tanya user. **Jangan menebak.**
