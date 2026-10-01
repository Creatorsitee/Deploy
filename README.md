# CMNTY Deploy — Cloud Edge Deployment Platform

<p align="center">
  <strong>Platform Deploy Web & Serverless Berkinerja Tinggi dengan Routing Edge Otomatis.</strong><br>
  Deploy berkas HTML tunggal, proyek ZIP statis (React, Vite, Vue, Astro, Next.js), atau starter template dalam hitungan detik dengan subdomain gratis (*.cmnty.biz.id), sertifikat SSL instan, dan inspeksi environment variable otomatis.
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Next.js-15.4-black?style=flat-square&logo=next.js" alt="Next.js">
  <img src="https://img.shields.io/badge/React-19-blue?style=flat-square&logo=react" alt="React">
  <img src="https://img.shields.io/badge/Tailwind_CSS-v4-38B2AC?style=flat-square&logo=tailwind-css" alt="Tailwind">
  <img src="https://img.shields.io/badge/Database-Pure_JSON-amber?style=flat-square" alt="Database JSON">
  <img src="https://img.shields.io/badge/License-MIT-green?style=flat-square" alt="License">
</p>

---

## 📑 Daftar Isi

- [Arsitektur & Gambaran Umum](#-arsitektur--gambaran-umum)
- [Fitur Utama](#-fitur-utama)
- [Struktur Direktori Proyek](#-struktur-direktori-proyek)
- [Alur Kerja Deployment](#-alur-kerja-deployment)
- [Struktur Database JSON](#-struktur-database-json)
- [Panduan Environment Variables (.env)](#-panduan-environment-variables-env)
- [Instalasi & Menjalankan Proyek](#-instalasi--menjalankan-proyek)
- [Daftar Endpoint API](#-daftar-endpoint-api)
- [Konfigurasi DNS & Domain](#-konfigurasi-dns--domain)
- [Admin Panel](#-admin-panel)

---

## 🏛️ Arsitektur & Gambaran Umum

CMNTY Deploy dirancang dengan filosofi kesederhanaan, kecepatan, dan tanpa dependensi berlebih. Platform ini dibangun di atas Next.js 15 App Router dan menggunakan **database lokal berbasis file JSON** (`.data/cmnty_db.json`) yang persisten, aman, dan tanpa kebutuhan layanan cloud eksternal seperti Firebase.

```text
               +-------------------------------------------------+
               |              Pengguna / Developer               |
               +-------------------------------------------------+
                                       |
                   (Upload ZIP / Starter / Atur Env)
                                       v
               +-------------------------------------------------+
               |              CMNTY Web Platform                 |
               |  (Next.js 15, Tailwind v4, Motion Animations)   |
               +-------------------------------------------------+
                         /             |             \
                        /              |              \
                       v               v               v
          +------------------+ +---------------+ +------------------+
          |  Auth & Session  | | Database JSON | |   Env Scanner    |
          |  (PBKDF2/Cookie) | | (.data/*.json)| | (Auto-Detect Env)|
          +------------------+ +---------------+ +------------------+
                                       |
                                       v
               +-------------------------------------------------+
               |             Vercel Cloud Edge API               |
               |      (Global Edge Routing, CDN & SSL Auto)      |
               +-------------------------------------------------+
                                       |
                                       v
               +-------------------------------------------------+
               |    Live URL: https://[project-slug].cmnty.biz.id |
               +-------------------------------------------------+
```

---

## 🚀 Fitur Utama

- **Zero-Config Instant Deploy**: Unggah berkas tunggal `index.html` atau arsip ZIP proyek web statis apa pun (React, Vite, HTML/CSS/JS, Astro, Svelte, dsb.).
- **Subdomain Otomatis & Gratis**: Setiap proyek langsung mendapatkan live subdomain publik `[slug].cmnty.biz.id` dengan SSL otomatis.
- **⚡ Smart Environment Auto-Detector**: Memindai isi berkas `.env`, `.env.example`, `.env.sample`, dan kode sumber di dalam ZIP saat proses upload untuk mendeteksi key & value secara otomatis.
- **Dukungan Custom Domain**: Pengguna dapat menambahkan domain kustom mereka sendiri lengkap dengan instruksi verifikasi DNS dan pemantauan status SSL.
- **Minimalist Build Inspector**: Tampilan modal log ringkas untuk memantau proses deployment baris demi baris secara rapi tanpa elemen visual yang mengganggu.
- **Transisi Animasi Menu**: Drawer navigasi seluler yang responsif dilengkapi animasi transisi halus *spring slide-up* dari bawah menggunakan `motion/react`.
- **Fair-Use Quotas & Proteksi**:
  - Kuota proyek per akun (default: 3 proyek).
  - Batas maksimal deployment harian (default: 50 build/hari).
  - Proteksi kata kunci reserved (mencegah pembuatan subdomain seperti `api`, `admin`, `login`, `dashboard`, `www`, dll.).
- **Admin Panel Terintegrasi**: Kontrol penuh atas seluruh pengguna terdaftar, audit log sistem, manajemen domain, dan konfigurasi server.

---

## 📂 Struktur Direktori Proyek

```text
cmnty-deploy-applet/
├── app/                               # Next.js App Router
│   ├── (auth)/
│   │   ├── login/page.tsx             # Halaman Sign In (User & Admin)
│   │   └── register/page.tsx          # Halaman Pendaftaran Akun Baru
│   ├── admin/
│   │   └── page.tsx                   # Super Admin Control Center
│   ├── api/                           # Backend API Server Routes
│   │   ├── admin/                     # API Khusus Administrator
│   │   │   ├── domains/route.ts
│   │   │   ├── projects/route.ts
│   │   │   ├── system/route.ts
│   │   │   └── users/route.ts
│   │   ├── auth/                      # API Autentikasi Pengguna
│   │   │   ├── login/route.ts
│   │   │   ├── logout/route.ts
│   │   │   ├── me/route.ts
│   │   │   └── register/route.ts
│   │   ├── deployments/
│   │   │   └── [id]/route.ts          # API Detail & Log Deployment
│   │   ├── frameworks/route.ts        # Daftar Preset Framework
│   │   └── projects/                  # API Manajemen Proyek
│   │       ├── route.ts               # List & Create Project
│   │       └── [id]/
│   │           ├── deploy/route.ts    # Trigger Redeployment
│   │           ├── domains/route.ts   # Custom Domain Management
│   │           ├── env/route.ts       # Environment Variables Management
│   │           └── route.ts           # Get, Update, Delete Project
│   ├── dashboard/                     # User Dashboard Area
│   │   ├── page.tsx                   # Dashboard Overview & Quick Stats
│   │   ├── new/page.tsx               # Deploy Form (ZIP Upload, Presets, Env Detector)
│   │   ├── projects/
│   │   │   ├── page.tsx               # Daftar Semua Proyek Pengguna
│   │   │   └── [id]/page.tsx          # Detail Proyek, Env, Domain, Build Modal
│   │   └── usage/page.tsx             # Kuota & Metrik Penggunaan Akun
│   ├── docs/page.tsx                  # Dokumentasi Lengkap Pengguna & Developer
│   ├── globals.css                    # Styling Global Tailwind CSS v4
│   ├── layout.tsx                     # Root Layout & Metadata
│   └── page.tsx                       # Landing Page / Beranda Publik
│
├── components/                        # Komponen UI Reusable
│   ├── DashboardLayout.tsx            # Kerangka Navigasi Dashboard (Sidebar & Mobile Drawer)
│   ├── DeploymentStatusBadge.tsx      # Indikator Visual Status Build
│   ├── Footer.tsx                     # Footer Publik
│   ├── Navbar.tsx                     # Sticky Header & Drawer Animasi
│   └── SslStatusBadge.tsx             # Indikator Sertifikat SSL Domain
│
├── lib/                               # Core Logic & Utilities
│   ├── auth/                          # Logika Keamanan & Sesi
│   │   ├── client.ts                  # Autentikasi Sisi Klien & Sinkronisasi Store
│   │   ├── server.ts                  # Verifikasi Token & RBAC di API
│   │   └── session.ts                 # Hashing PBKDF2 & Enkripsi Cookie
│   ├── db/                            # Persistence Layer (JSON Database)
│   │   └── store.ts                   # Engine Database JSON Atomik (.data/cmnty_db.json)
│   ├── vercel/                        # Integrasi Edge Engine Vercel
│   │   ├── client.ts                  # HTTP Client Vercel REST API
│   │   ├── deployments.ts             # Trigger & Inspect Deployment
│   │   ├── frameworks.ts              # Preset & Aturan Deteksi Framework
│   │   └── projects.ts                # Sinkronisasi Proyek & Domain
│   ├── contexts/
│   │   └── ToastContext.tsx           # Notifikasi Toast & Modal Konfirmasi
│   ├── deployment-service.ts          # Orkestrator Pipeline Deployment
│   ├── env-detector.ts                # Scanner Berkas ZIP & Parser Env Otomatis
│   ├── fetch-utils.ts                 # Helper Fetch Aman (safeJson)
│   └── types.ts                       # Definisi Tipe TypeScript
│
├── public/                            # Aset Statis
├── .data/                             # Lokasi Penyimpanan Database JSON (Otomatis Dibuat)
│   └── cmnty_db.json                  # Berkas Database Utama
│
├── .env.example                       # Contoh Konfigurasi Environment Esensial
├── next.config.ts                     # Konfigurasi Next.js
├── package.json                       # Dependensi & Skrip Node.js
├── tsconfig.json                      # Konfigurasi TypeScript
└── README.md                          # Dokumentasi Proyek
```

---

## 🔄 Alur Kerja Deployment

1. **Pemilihan Sumber Proyek**:
   - Pengguna memilih untuk mengunggah berkas ZIP proyek, berkas HTML tunggal, atau memilih starter template siap pakai.
2. **Inspeksi Berkas & Auto-Detect**:
   - Sistem secara otomatis mengekstrak berkas ZIP di memory buffer.
   - Algoritma pemindai mendeteksi berkas konfigurasi (`.env`, `.env.example`, `package.json`).
   - Variabel lingkungan yang terdeteksi disajikan ke pengguna untuk diverifikasi sebelum dikirim.
3. **Penyimpanan Metadata & Quota Check**:
   - Sistem memeriksa batas maksimal proyek (3) dan batas harian (50) di database JSON.
   - Memastikan nama subdomain bukan merupakan reserved keyword.
4. **Provisioning ke Cloud Edge**:
   - Proyek diteruskan ke engine Vercel Edge API menggunakan token yang terkonfigurasi.
   - Subdomain `[slug].cmnty.biz.id` dipetakan secara otomatis.
5. **Live Monitoring**:
   - Pengguna dapat memantau log build secara real-time melalui modal log yang bersih dan minimalis.

---

## 🗄️ Struktur Database JSON

Data aplikasi disimpan secara terstruktur dan terisolasi pada berkas `.data/cmnty_db.json`:

```json
{
  "users": [
    {
      "id": "usr_xxxx",
      "email": "user@example.com",
      "name": "Developer Name",
      "passwordHash": "pbkdf2_xxxxxxxx",
      "role": "user",
      "createdAt": "2026-09-29T02:00:00.000Z"
    }
  ],
  "projects": [
    {
      "id": "prj_xxxx",
      "userId": "usr_xxxx",
      "name": "Portofolio Keren",
      "slug": "portofolio-keren",
      "framework": "vite",
      "subdomain": "portofolio-keren.cmnty.biz.id",
      "latestDeploymentStatus": "READY",
      "createdAt": "2026-09-29T02:10:00.000Z"
    }
  ],
  "deployments": [],
  "domains": [],
  "environmentVariables": [],
  "auditLogs": [],
  "systemConfig": {
    "vercelToken": "",
    "baseDomain": "cmnty.biz.id",
    "availableDomains": ["cmnty.biz.id"],
    "allowPublicRegistration": true,
    "maxProjectsPerUser": 3,
    "maxDeploymentsPerDay": 50
  }
}
```

---

## ⚙️ Panduan Environment Variables (`.env`)

Salin berkas `.env.example` menjadi `.env` atau `.env.local`:

```bash
cp .env.example .env.local
```

Berikut variabel yang **penting dan esensial**:

| Variabel | Deskripsi | Wajib / Opsional | Nilai Default / Contoh |
|:---|:---|:---|:---|
| `ADMIN_NAME` | Nama tampilan akun Super Administrator | Opsional | `"System Admin"` |
| `ADMIN_EMAIL` | Alamat email untuk login Administrator | **Wajib** | `"admin@cmnty.biz.id"` |
| `ADMIN_PASSWORD` | Kata sandi untuk login Administrator | **Wajib** | `"PasswordKuatMinimal8Karakter!"` |
| `VERCEL_TOKEN` | Personal Access Token dari Vercel untuk Edge Routing | **Wajib** (untuk deploy) | `"xYzA123456789..."` |
| `BASE_DOMAIN` | Domain dasar untuk routing subdomain wildcard | Opsional | `"cmnty.biz.id"` |
| `SESSION_SECRET` | Kunci enkripsi tanda tangan cookie sesi (min 32 karakter) | Rekomendasi | `"cmnty-deploy-super-secure-key-32-chars"` |
| `APP_URL` | URL publik dari platform CMNTY Deploy | Opsional | `"https://cmnty.biz.id"` |

> 💡 **Apa fungsi `SESSION_SECRET`?**  
> `SESSION_SECRET` adalah kunci rahasia kriptografi yang digunakan server untuk membuat tanda tangan digital (HMAC-SHA256) pada token sesi login pengguna. Dengan kunci ini, siapapun tidak dapat memalsukan atau mengubah data login (misal: mengubah akun biasa menjadi admin) di dalam browser cookie. Tanpa kunci yang cocok, server akan menolak sesi tersebut.

---

## 🚂 Deploy ke Railway

Platform ini sudah dilengkapi berkas `railway.json` dan `.env.example` standar yang otomatis terbaca oleh Railway:

1. **Deploy dari GitHub**:
   - Di dashboard [Railway](https://railway.com), buat proyek baru via **Deploy from GitHub repo**.
   - Pilih repositori ini.
2. **Pengisian Variabel Lingkungan**:
   - Di tab **Variables** service Anda, klik tombol **"Raw Editor"** atau **"Add Variable"**.
   - Cukup salin seluruh isi berkas `.env.example` dan tempel ke kolom Raw Editor Railway, lalu ubah nilainya sesuai konfigurasi Anda (misalnya isi `VERCEL_TOKEN` Anda).
3. **Public Networking**:
   - Di tab **Settings** service, klik **Generate Domain** di bawah bagian **Networking**.
   - Salin domain yang dihasilkan Railway dan masukkan ke variabel `APP_URL`.
   - Service akan otomatis ter-build via Nixpacks dan langsung online!

---

---

## 💻 Instalasi & Menjalankan Proyek

### Prasyarat
- **Node.js**: Versi `18.18+` atau `20+`
- **npm** atau **pnpm**

### Langkah Menjalankan:

1. **Clone Repository & Masuk ke Folder**:
   ```bash
   git clone <repo-url>
   cd cmnty-deploy-applet
   ```

2. **Install Seluruh Dependensi**:
   ```bash
   npm install
   ```

3. **Konfigurasikan Berkas Environment**:
   ```bash
   cp .env.example .env.local
   # Buka .env.local dan isi VERCEL_TOKEN serta kredensial ADMIN
   ```

4. **Jalankan Development Server**:
   ```bash
   npm run dev
   ```
   Akses melalui browser di [http://localhost:3000](http://localhost:3000).

5. **Build untuk Produksi**:
   ```bash
   npm run build
   npm run start
   ```

---

## 📡 Daftar Endpoint API

### 🔐 Autentikasi (`/api/auth`)
- `POST /api/auth/register` — Mendaftarkan akun pengguna baru.
- `POST /api/auth/login` — Autentikasi dan pembuatan cookie sesi.
- `POST /api/auth/logout` — Menghapus cookie sesi aktif.
- `GET /api/auth/me` — Mengambil data profil pengguna yang sedang login.

### 📦 Manajemen Proyek (`/api/projects`)
- `GET /api/projects` — Mengambil daftar proyek milik pengguna.
- `POST /api/projects` — Membuat dan mendeploy proyek baru (mendukung `multipart/form-data` ZIP).
- `GET /api/projects/:id` — Detail proyek, riwayat build, dan daftar domain.
- `DELETE /api/projects/:id` — Menghapus proyek secara permanen.
- `POST /api/projects/:id/deploy` — Memicu deployment ulang (redeploy).
- `GET /api/projects/:id/domains` & `POST` / `DELETE` — Manajemen custom domain proyek.
- `GET /api/projects/:id/env` & `POST` / `DELETE` — Manajemen variabel lingkungan (environment variables).

### 🛡️ Administrator (`/api/admin`)
- `GET /api/admin/users` — Daftar semua akun pengguna di sistem.
- `GET /api/admin/projects` — Seluruh proyek lintas pengguna.
- `GET /api/admin/system` & `PATCH` — Konfigurasi kuota, domain dasar, dan audit log.
- `GET /api/admin/domains` & `POST` — Mengelola daftar domain dasar yang diizinkan.

---

## 🌐 Konfigurasi DNS & Domain

Agar fitur subdomain otomatis (*.cmnty.biz.id) dan apex domain dapat melayani traffic global, konfigurasikan DNS record pada penyedia DNS Anda (Cloudflare, Namecheap, Niagahoster, dll.):

| Tipe Record | Nama / Host | Nilai / Target | Keterangan |
|:---|:---|:---|:---|
| **CNAME** | `*` (atau `*.cmnty.biz.id`) | `cname.vercel-dns.com` | Wildcard untuk seluruh subdomain otomatis pengguna |
| **A** | `@` (apex domain) | `76.76.21.21` | Mengarahkan domain utama ke landing page |

---

## 🛡️ Admin Panel

Akses control center administrator melalui rute `/admin`. Masuk menggunakan `ADMIN_EMAIL` dan `ADMIN_PASSWORD` yang telah ditentukan pada `.env.local`.

Fitur pada Admin Panel meliputi:
1. **Ringkasan Metrik**: Total pengguna, total proyek aktif, total deployment yang berhasil.
2. **Manajemen Pengguna**: Mengatur role pengguna (`admin` / `user`), melihat email, dan tanggal registrasi.
3. **Pengawasan Proyek**: Memantau proyek-proyek yang dibuat, status deploy, dan penggunaan bandwidth/sumber daya.
4. **Audit Trail**: Mencatat aktivitas sistem secara otomatis untuk kepatuhan dan pelacakan audit keamanan.

---

<p align="center">
  Dibuat untuk ekosistem pengembang modern &bull; <strong>CMNTY Deploy</strong>
</p>
