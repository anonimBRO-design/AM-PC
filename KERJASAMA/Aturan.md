# Aturan Kerja Bersama

> **File ini jarang berubah.** Isinya aturan yang berlaku untuk semua agent.
> Kalau melanggar salah satu, kerjaan agent lain bisa rusak.

Bagian dari [[README|protokol kerja bersama]].
State proyek: [[Handoff]] · Kejadian buruk: [[Jebakan]] · Fakta: [[Fakta]]

---

## 1. Baca dulu, baru kerja

**Wajib dibaca sebelum mengubah apa pun:**

| File | Isi | Kalau dilewat |
|---|---|---|
| [[Handoff]] | State terkini, sedang apa | Mengerjakan yang sudah selesai |
| [[Jebakan]] | Kesalahan yang pernah terjadi | Mengulangi kesalahan yang sama |
| [[Fakta]] | Fakta terverifikasi + bukti | Salah menyimpulkan |

**Jangan tanya ke user apa yang sudah dikerjakan.** Jawabannya ada di file.

---

## 2. Satu file, satu pemilik

**Ini aturan terpenting.** Pelanggarannya sudah dua kali bikin rugi:

- **Web Kelas X 1** — dua agent bikin font dengan nama berbeda
  (`plusjakarta.woff2` vs `jakarta.woff2`). Yang ter-deploy merujuk file
  yang tidak ada → font 404.
- **AM-PC** — Claude Code hampir sync ulang padahal Antigravity sudah selesai.

### Daftar pemilik

| File / folder | Pemilik | Aturan |
|---|---|---|
| `index.html` | **upstream** | Jangan diedit. Cuma boleh di-sync. |
| `electron/`, `scripts/`, `css/` | **Antigravity** | Claude Code jangan sentuh tanpa izin |
| `README.md` | **Antigravity** | Branding lokal |
| `icons/` | **Antigravity** | — |
| `KERJASAMA/` | **semua** | Boleh dibaca semua, tulis di file sendiri |
| `release/` | — | Hasil build, di-`.gitignore` |

**Kalau perlu mengubah file milik agent lain:**

1. Tulis dulu di [[Handoff]] bagian "Sedang apa" — biar yang punya tahu
2. Tunggu sampai dia tidak aktif
3. Setelah selesai, tulis di [[Handoff]] bahwa kamu selesai

**Jangan langsung edit.** Itu yang bikin tabrakan.

---

## 3. Jangan simpulkan dari git log

**Kejadian 9 Okt 2026:** Claude Code melihat `git log HEAD..upstream/main`
menampilkan commit besar, lalu menyimpulkan "ketinggalan, harus sync".
Padahal isinya sudah sama.

**Aturan:**

| ❌ Jangan | ✅ Lakukan |
|---|---|
| Baca `git log` lalu menyimpulkan | Bandingkan **isi file** pakai hash |
| Percaya "behind by 1 commit" | Cek `git diff` file yang benar-benar berubah |
| Langsung eksekusi | Verifikasi dulu, catat di [[Fakta]] |

**Cara benar:**

```bash
git rev-parse HEAD:index.html
git rev-parse upstream/main:index.html
# kalau sama -> tidak perlu sync
```

---

## 4. Satu agent, satu bagian

Kalau dua agent bekerja bersamaan:

| Agent | Bagian |
|---|---|
| Antigravity | Desktop app, build, ikon, branding |
| Claude Code | Dokumentasi, analisis, kerja sama |

**Jangan kerja di file yang sama.** Kalau tidak bisa dihindari, commit dulu
sebelum mulai — git satu-satunya cara mendeteksi tabrakan.

---

## 5. Jangan pakai `git add -A`

**Kejadian:** di proyek lain, `git add -A` menyapu kerjaan agent lain yang
belum selesai.

**Aturan:** tambahkan file secara eksplisit.

```bash
git add index.html          # benar
git add KERJASAMA/          # benar

git add -A                  # SALAH
git add .                   # SALAH
```

---

## 6. Verifikasi sebelum bilang "selesai"

**Jangan bilang "sudah beres" tanpa bukti.**

| Yang diklaim | Bukti yang harus ada |
|---|---|
| "Sudah di-sync" | hash file sama |
| "Sudah dibuild" | file `.exe` ada + waktu build |
| "Tidak ada error" | output perintah |
| "Tampilan bagus" | screenshot atau pengukuran |

Kalau tidak bisa membuktikan, tulis **"belum diverifikasi"** —
jangan tulis "selesai".

---

## 7. Tulis yang gagal, bukan cuma yang berhasil

Log yang cuma berisi kabar baik **tidak berguna**.

Kalau kamu mencoba sesuatu dan gagal, tulis:

- Apa yang dicoba
- Kenapa gagal
- Apa yang dipelajari

Agent berikutnya akan menghemat waktu karena tidak mengulang jalan buntu
yang sama.

---

## 8. Bahasa

**Bahasa Indonesia** untuk semua tulisan di folder ini.
Komentar kode juga Indonesia.

Alasan: user berbahasa Indonesia, dan konsisten dengan proyek lain.

---

## Ringkasan (kalau cuma baca satu bagian)

1. **Baca** [[Handoff]] + [[Jebakan]] + [[Fakta]] sebelum kerja
2. **Cek pemilik** file — kalau bukan punyamu, jangan sentuh
3. **Verifikasi** pakai hash, jangan pakai git log
4. **Commit** file secara eksplisit, jangan `git add -A`
5. **Tulis** yang gagal juga, bukan cuma yang berhasil
