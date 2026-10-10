@AGENTS.md

# Catatan khusus Claude Code

File ini cuma merujuk `AGENTS.md` di baris pertama. **Jangan menyalin isinya** —
kalau disalin, dua file bisa berbeda dan bikin aturan bentrok.

## Kenapa harus begini

Claude Code **mengabaikan `AGENTS.md`** kalau ada `CLAUDE.md`.
opencode dan Antigravity sebaliknya — pakai `AGENTS.md`, abaikan `CLAUDE.md`.

Jadi: `AGENTS.md` = satu-satunya sumber aturan, `CLAUDE.md` cuma pintu masuknya.

## Yang harus dibaca sebelum mulai

1. `KERJASAMA/Handoff.md` — state terkini
2. `KERJASAMA/Jebakan.md` — jangan ulangi kesalahan
3. `KERJASAMA/Fakta.md` — fakta terverifikasi + bukti

## Peringatan untuk Claude Code

Pada 9 Okt 2026, Claude Code hampir merusak kerjaan Antigravity karena
menyimpulkan "fork ketinggalan" dari `git log` — padahal isinya sudah sama.

**Jangan ulangi.** Cek hash file, bukan riwayat git:

```bash
git rev-parse HEAD:index.html
git rev-parse upstream/main:index.html
```

Detail: `KERJASAMA/Jebakan.md` §1
