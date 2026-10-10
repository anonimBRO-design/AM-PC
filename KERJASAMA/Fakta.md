# Fakta Terverifikasi

> **File ini DITAMBAH, jangan dihapus.** Isinya fakta yang sudah dicek dengan
> bukti, supaya agent berikutnya tidak perlu bongkar ulang — dan tidak salah
> menyimpulkan seperti yang pernah terjadi.

Bagian dari [[README|protokol kerja bersama]]. Aturan kerja ada di [[Aturan]].
State proyek ada di [[Handoff]]. Kejadian buruk ada di [[Jebakan]].

---

## Kenapa file ini ada

Pada 9 Oktober 2026, Claude Code hampir merusak kerjaan Antigravity.

Kejadiannya:

1. Claude Code menjalankan `git log HEAD..upstream/main`
2. Muncul `85e5555 "New feature" — 11.381 baris`
3. Claude Code menyimpulkan: **"fork ketinggalan, harus sync ulang"**
4. Padahal **isinya sudah sama** — `index.html` di HEAD dan upstream punya
   hash **identik** (`8816e9f9b03ce058...`)

Kalau kesimpulan itu dieksekusi, kerjaan Antigravity bisa tertimpa.

**Penyebabnya:** membaca riwayat git tanpa memeriksa isi file.

**Solusinya:** catat fakta + buktinya di sini, sekali. Agent berikutnya
tinggal baca — tidak perlu menebak.

---

## Cara menulis fakta di sini

Setiap fakta **wajib** punya:

| Bagian | Isi |
|---|---|
| **Fakta** | pernyataan singkat |
| **Bukti** | perintah atau hash yang membuktikan |
| **Diperiksa** | tanggal + siapa |
| **Akibat** | apa yang harus / tidak boleh dilakukan |

Fakta tanpa bukti **tidak boleh** masuk sini. Kalau belum diverifikasi,
tulis di [[Handoff]] sebagai "belum pasti".

---

## AM-PC

### F-01 · `index.html` sudah versi terbaru

- **Fakta:** `index.html` di repo ini sama persis dengan upstream `Hada45/Open-Motion`
- **Bukti:**
  ```
  git rev-parse HEAD:index.html          → 8816e9f9b03ce058e1543f136e17fabff0a89093
  git rev-parse upstream/main:index.html → 8816e9f9b03ce058e1543f136e17fabff0a89093
  ```
- **Diperiksa:** 9 Okt 2026, Claude Code
- **Akibat:** **JANGAN sync ulang.** Sudah terbaru. Kalau ada yang bilang
  "ketinggalan", cek hash dulu.

### F-02 · Modif Antigravity sengaja dipisah dari `index.html`

- **Fakta:** Antigravity menaruh semua modif di luar `index.html`
- **Bukti:**
  ```
  git diff --name-only 85e5555 HEAD -- index.html   → (kosong)
  ```
  File yang dia tambah: `css/desktop.css`, `css/theme.css`,
  `electron/main.js`, `scripts/build-portable.js`, `icons/`
- **Diperiksa:** 9 Okt 2026, Claude Code
- **Akibat:** Ini **keputusan yang benar** — bikin upgrade aman.
  Jangan "rapikan" dengan menggabungkannya ke `index.html`.

### ~~F-03 · `css/desktop.css` dan `css/theme.css` TIDAK dipakai~~ (DIPERBARUI 10 Okt 2026)

- **Fakta:** Kedua file CSS sekarang **SUDAH AKTIF** dan dimuat otomatis di aplikasi desktop tanpa menyentuh/mengubah `index.html`.
- **Bukti:**
  - Disuntikkan lewat `mainWindow.webContents.insertCSS` pada event `dom-ready` di `electron/main.js`.
  - Class `is-electron` dipasang otomatis pada `document.body` via `electron/preload.js`.
  - Aturan `.hidden` dilindungi agar elemen tersembunyi tidak bocor.
- **Diperiksa:** 10 Okt 2026, Antigravity
- **Akibat:** Aplikasi desktop sekarang mengadopsi layout multi-panel widescreen studio PC dan tema resmi Alight Motion, sementara `index.html` tetap 100% identik dengan upstream.

### F-04 · Build `.exe` berisi versi terbaru

- **Fakta:** `.exe` portable dibuild dari `index.html` terbaru
- **Bukti:**
  ```
  sumber  : 8c2d5860d53f9b78 (sha256, 16 char pertama)
  di exe  : 8c2d5860d53f9b78
  ```
  Waktu: `index.html` diubah 06:30, `.exe` dibuild 06:32
- **Diperiksa:** 9 Okt 2026, Claude Code
- **Akibat:** Aman dipakai. Urutan build sudah benar.

### F-05 · Aplikasi jalan normal

- **Fakta:** `.exe` dijalankan, tampil splash screen dengan benar
- **Bukti:** Judul window `"Alight Motion PC Open Motion V5.209 - Single HTML"`,
  splash "Open Motion is still experimental" tampil rapi
- **Diperiksa:** 9 Okt 2026, Claude Code
- **Akibat:** Keluhan "kacau balau" **bukan** dari versi sekarang.
  Kalau masih terasa kacau, sebutkan bagian mana — jangan bilang "semuanya".

### F-06 · Ada 2 remote git

- **Fakta:** `origin` = fork sendiri, `upstream` = sumber asli
- **Bukti:**
  ```
  origin   → github.com/anonimBRO-design/AM-PC
  upstream → github.com/Hada45/Open-Motion
  ```
- **Diperiksa:** 9 Okt 2026, Claude Code
- **Akibat:** Selalu `git fetch upstream` dulu sebelum membandingkan.
  Jangan pakai `origin` untuk cek versi terbaru.

### F-07 · Aplikasi tidak ada di git

- **Fakta:** `release/` ada di `.gitignore`, jadi `.exe` tidak masuk repo
- **Bukti:** `.gitignore` baris 2: `release/`
- **Diperiksa:** 9 Okt 2026, Claude Code
- **Akibat:** Kalau mau bagikan `.exe`, harus lewat GitHub Releases
  atau link lain — bukan lewat commit.

### F-14 · Upstream menyembunyikan outline seleksi di tepi kanvas (`boundarySegment`)

- **Fakta:** Upstream Open-Motion (`index.html` baris 11377-11396) secara sengaja melewati (`skip`) penggambaran sisi outline seleksi jika garis tersebut berimpit dengan batas kanvas (`boundarySegment(a, b)`). Akibatnya, layer yang mengisi 100% layar (seperti video/gambar 1080×1920) keempat sisinya tidak digambar sama sekali (terlihat seperti tidak terpilih).
- **Bukti:**
  ```javascript
  const boundarySegment=(a,b)=>(
    (near(a.x,0)&&near(b.x,0)) ||
    (near(a.x,W)&&near(b.x,W)) ||
    (near(a.y,0)&&near(b.y,0)) ||
    (near(a.y,H)&&near(b.y,H))
  );
  if(boundarySegment(a,b))continue;
  ```
- **Diperiksa:** 10 Okt 2026, Antigravity
- **Akibat:** Untuk membuat hitbox seleksi cyan otentik Alight Motion, supresi ini dihapus di modul `electron/am-hitbox.js` dengan meng-override `WebGLRenderer.prototype.drawOverlay`, sehingga semua layer terpilih selalu menampilkan outline cyan neon `#00e5ff` secara utuh.


---

## Cara memakai file ini

**Sebelum mengubah apa pun:**

1. Baca [[Handoff]] — state terkini
2. Baca [[Jebakan]] — jangan ulangi kesalahan
3. **Baca file ini** — fakta yang sudah terverifikasi

**Kalau kamu menemukan fakta baru:**

1. Verifikasi dulu (jalankan perintahnya, jangan menebak)
2. Tambahkan di bawah, pakai format yang sama
3. Sertakan bukti — hash, perintah, atau output

**Kalau fakta lama ternyata salah:**

**Jangan hapus.** Tandai:

```
### ~~F-07 · fakta lama~~ (SALAH - dikoreksi 10 Okt 2026)
Alasan: ...
Fakta yang benar: lihat F-09
```

Alasannya: agent berikutnya perlu tahu **kenapa** dulu salah, biar tidak
mengulangi cara berpikir yang sama.

---

## CLI Agent (ditemukan 9 Okt 2026)

### F-08 · Kedua CLI jalan headless

- **Fakta:** `claude` dan `agy` bisa dijalankan non-interaktif
- **Bukti:**
  ```
  claude -p "jawab: OK" --output-format text   → OK
  agy    -p "say OK"                            → OK
  ```
- **Diperiksa:** 9 Okt 2026, Claude Code
- **Akibat:** RigDeck **bisa** menyambung ke keduanya.

### F-09 · `claude` CLI butuh 3 env var dari 9Router

- **Fakta:** `claude` CLI gagal dengan "Not logged in" kalau env ini tidak ada
- **Bukti:** setelah env dipasang, `claude -p` berhasil
  ```
  ANTHROPIC_BASE_URL=https://api.rindri.com
  ANTHROPIC_AUTH_TOKEN=sk-rindri-...   (lihat ~/.claude/settings.json)
  ANTHROPIC_DEFAULT_HAIKU_MODEL=claude-haiku-4-5
  ```
- **Diperiksa:** 9 Okt 2026, Claude Code
- **Akibat:** **JANGAN hardcode token di kode.** Baca dari
  `~/.claude/settings.json`. Token bisa berubah.

### F-10 · Format stream-json keduanya BERBEDA

- **Fakta:** Tidak bisa pakai parser yang sama untuk dua-duanya
- **Bukti:**
  ```
  CLAUDE:  {"type":"assistant","message":{"content":[{"type":"text",...}]}}
  AGY:     {"event":"step_update","step_update":{"state":"DONE",...}}
  ```
- **Diperiksa:** 9 Okt 2026, Claude Code
- **Akibat:** Butuh **lapisan penerjemah** (adapter) per agent.
  RigDeck harus punya 2 parser terpisah.

### F-11 · `claude` stream-json wajib `--verbose`

- **Fakta:** Tanpa `--verbose`, langsung error
- **Bukti:** `Error: When using --print, --output-format=stream-json requires --verbose`
- **Diperiksa:** 9 Okt 2026, Claude Code
- **Akibat:** Perintah yang benar:
  ```
  claude -p "<prompt>" --output-format stream-json --verbose
  ```

### F-12 · Jawaban `agy` ada di `event:result`, bukan `step_update`

- **Fakta:** `step_update` cuma status langkah, tanpa isi jawaban
- **Bukti:**
  ```
  {"event":"result","result":{"status":"SUCCESS","response":"BERHASIL\n",...}}
  ```
- **Diperiksa:** 9 Okt 2026, Claude Code
- **Akibat:** Parser harus baca `result.response`. Kalau baca `step_update`,
  jawabannya kosong.

### F-13 · Di Windows, `claude` harus dipanggil lewat `claude.exe`

- **Fakta:** `claude.cmd` tidak bisa di-spawn Node tanpa `shell:true`
  (error `EINVAL`). `shell:true` memicu DeprecationWarning + risiko injeksi.
- **Bukti:** binary asli ada di
  `AppData/Roaming/npm/node_modules/@anthropic-ai/claude-code/bin/claude.exe`
- **Diperiksa:** 9 Okt 2026, Claude Code
- **Akibat:** Resolve path `.exe` dulu, jangan `.cmd`.

### F-14 · Akses instance inti Open Motion via window globals & IndexedDB

- **Fakta:** Variabel internal `model`, `renderer`, `timeline`, dan `ui` berada dalam closure IIFE privat di `index.html`. Namun Open Motion secara resmi mengekspos instancenya ke properti `window`:
  - `model`: `window.omsTimelinePreRender.model`
  - `renderer`: `window.omsTimelinePreRender.renderer`
  - `timeline`: `window.omsTimelinePreRender.timeline`
  - `ui`: `window.omsAppBackRouter.ui`
- **Bukti:**
  - `index.html:16806` → `window.omsTimelinePreRender=timelinePreRender;`
  - `index.html:23378` → `window.omsAppBackRouter=omsAppBackRouter;`
  - IndexedDB database: `'open-motion-studio-v4'`, object store: `'projects'` & `'assets'`.
- **Diperiksa:** 10 Okt 2026, Antigravity
- **Akibat:** Skrip kustom luar (seperti thumbnail generator) harus mengambil `model` dan `renderer` via `window.omsTimelinePreRender`. Proyek tersimpan dapat dibaca langsung melalui IndexedDB browser tanpa perlu menunggu method internal.
