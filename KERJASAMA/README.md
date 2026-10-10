# Protokol Kerja Bersama

Papan kerja untuk agent AI yang mengerjakan **AM-PC** — fork Open Motion
yang dibungkus jadi aplikasi desktop Windows.

---

## Kenapa ada ini

Agent AI tidak punya memori bersama. Tiap sesi mulai dari nol.

Akibatnya, sudah **dua kali** kerjaan rusak:

| Kejadian | Akibat |
|---|---|
| Dua agent bikin font dengan nama berbeda | Font 404 di Web Kelas X 1 |
| Claude Code hampir sync ulang | Kerjaan Antigravity hampir tertimpa |

Folder ini menutup celah itu. File markdown biasa, dibaca dan ditulis
agent mana pun. Tanpa plugin, tanpa MCP, tanpa setup.

---

## Isi

| File | Sifat | Isi | Kapan dibaca |
|---|---|---|---|
| [[Handoff]] | **ditimpa** | State terkini, sedang apa | **Selalu, sebelum mulai** |
| [[Jebakan]] | ditambah | Hal yang pernah bikin rugi | **Selalu, sebelum ubah kode** |
| [[Fakta]] | ditambah | Fakta terverifikasi + bukti | **Selalu, sebelum menyimpulkan** |
| [[Aturan]] | jarang berubah | Aturan kerja | Sekali di awal |
| `Log/` | ditambah | Catatan per sesi | Log terakhir saja |

---

## Protokol

### Sebelum mulai kerja

1. Baca **[[Handoff]]** — state terkini, sedang apa, berikutnya apa
2. Baca **[[Jebakan]]** — jangan ulangi kesalahan yang sama
3. Baca **[[Fakta]]** — jangan simpulkan ulang hal yang sudah terverifikasi
4. Cek **[[Aturan]] §2** — siapa pemilik file yang mau kamu ubah
5. Baca log terakhir di `Log/` kalau ada

### Setelah selesai kerja

1. Tulis log di `Log/YYYY-MM-DD <agent>.md`
2. Perbarui **[[Handoff]]** kalau state berubah
3. Tambahkan ke **[[Jebakan]]** kalau menemukan hal yang bikin rugi
4. Tambahkan ke **[[Fakta]]** kalau menemukan fakta baru + buktinya

---

## Cara menulis

### Apa adanya

Kalau gagal, tulis gagal dan kenapa. **Log yang cuma kabar baik tidak berguna.**

### Sertakan alasan

| ❌ Tidak berguna | ✅ Berguna |
|---|---|
| "Ganti ke SQLite" | "Ganti ke SQLite karena histori 24 jam tidak muat di memori" |
| "Sync berhasil" | "Sync berhasil, hash `8816e9f9...` sama dengan upstream" |

### Catat yang belum selesai

Itu bagian **paling berguna** untuk agent berikutnya.

### Sertakan bukti

Kalau mengklaim sesuatu, tunjukkan cara memverifikasinya. Hash, perintah,
output, atau screenshot.

---

## WAJIB: pakai wikilink

Vault ini dirender **Obsidian**. Nama file yang ditulis sebagai teks biasa
(`` `Jebakan.md` ``) **tidak menghasilkan edge** di graph view — catatannya
jadi pulau terpisah.

```markdown
SALAH:  Baca `Jebakan.md` dulu.
BENAR:  Baca [[Jebakan]] dulu.

SALAH:  Lihat KERJASAMA/Handoff.md
BENAR:  Lihat [[Handoff]]
```

**Aturan:**

- **Selalu** pakai tanda kurung siku ganda, contohnya seperti `[[Handoff]]`,
  tanpa akhiran `.md`, untuk catatan **di dalam vault**
- Nama tampilan berbeda: `[[Handoff|state proyek]]`
- Ke file **di luar** vault (`index.html`, `README.md` proyek) tetap pakai
  backtick — itu bukan catatan Obsidian
- Saat membuat catatan baru, tambahkan minimal satu link ke catatan yang ada
- Setelah menulis, pastikan namanya **persis sama** dengan nama file

---

## Perbedaan dengan vault dashboard

Vault di proyek `dashboard/claude code dan opencode/` **di-`.gitignore`** —
cuma untuk agent lokal.

Folder ini **masuk git**, karena:

- Ada 2 agent (Claude Code + Antigravity) yang jalan di komputer berbeda
- Perlu riwayat — siapa mengubah apa, kapan
- Kalau cuma lokal, agent lain tidak bisa baca

**Jangan tambahkan `KERJASAMA/` ke `.gitignore`.**

---

## Struktur

```
KERJASAMA/
├── README.md      ← kamu di sini
├── Aturan.md      ← aturan kerja (jarang berubah)
├── Handoff.md     ← state terkini (ditimpa)
├── Jebakan.md     ← kesalahan yang pernah terjadi (ditambah)
├── Fakta.md       ← fakta terverifikasi + bukti (ditambah)
└── Log/
    └── YYYY-MM-DD <agent>.md
```

---

## Ringkasan 30 detik

1. **Baca** [[Handoff]] + [[Jebakan]] + [[Fakta]] sebelum mulai
2. **Cek pemilik** file di [[Aturan]] §2 — kalau bukan punyamu, jangan sentuh
3. **Verifikasi** pakai hash, jangan pakai git log ([[Jebakan]] §1)
4. **Commit** file eksplisit, jangan `git add -A`
5. **Tulis** yang gagal juga, bukan cuma yang berhasil
