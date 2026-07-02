# Panduan Migrasi: Vercel + Neon → VPS

## Overview

App ini dibangun di atas Next.js 16 App Router dengan Prisma + PostgreSQL (Neon) dan di-deploy ke Vercel. Panduan ini menjelaskan langkah migrasi ke VPS mandiri.

---

## Stack Saat Ini (Vercel)

| Komponen | Layanan | Catatan |
|---|---|---|
| Hosting | Vercel Hobby | Free tier |
| Database | Neon PostgreSQL | Free tier, 0.5GB, bisa sleep |
| Cron | Vercel Cron | Max 2 cron, min interval 1 hari |
| Auth | NextAuth.js | Session di DB |
| File Storage | - | Tidak ada |

---

## Target Stack (VPS)

| Komponen | Rekomendasi | Catatan |
|---|---|---|
| Hosting | VPS (Ubuntu 22.04) | Nginx + PM2 atau Docker |
| Database | PostgreSQL self-hosted | Atau tetap pakai Neon |
| Cron | Linux crontab | Tidak ada limit |
| Auth | NextAuth.js | Tidak berubah |
| Reverse Proxy | Nginx | SSL via Certbot |

---

## Langkah Migrasi

### 1. Siapkan VPS

```bash
# Install Node.js 20+
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Install PM2
npm install -g pm2

# Install Nginx
sudo apt install -y nginx certbot python3-certbot-nginx
```

### 2. Clone & Build App

```bash
git clone <repo-url> /var/www/dashboard
cd /var/www/dashboard
npm install -g pnpm
pnpm install
pnpm build
```

### 3. Setup Environment Variables

Buat file `.env` di root project:

```env
DATABASE_URL="postgresql://user:pass@localhost:5432/dashboard"
NEXTAUTH_SECRET="your-secret-here"
NEXTAUTH_URL="https://yourdomain.com"
CRON_SECRET="your-cron-secret-here"
```

> **CRON_SECRET**: Generate dengan `openssl rand -base64 32`

### 4. Jalankan App dengan PM2

```bash
pm2 start pnpm --name "dashboard" -- start
pm2 save
pm2 startup
```

### 5. Setup Nginx

```nginx
server {
    server_name yourdomain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

```bash
sudo certbot --nginx -d yourdomain.com
```

### 6. Setup Cron (Pengganti Vercel Cron)

```bash
crontab -e
```

Tambahkan baris berikut (jam 00:00 WIB = 17:00 UTC):

```cron
0 17 * * * curl -s -X POST https://yourdomain.com/api/cron/daily-pnl \
  -H "Authorization: Bearer YOUR_CRON_SECRET" \
  >> /var/log/dashboard-cron.log 2>&1
```

> Di VPS tidak ada limit jumlah cron — bisa tambah sebanyak yang diperlukan.

### 7. Migrasi Database (jika pindah dari Neon)

```bash
# Export dari Neon
pg_dump "postgresql://neon-connection-string" > backup.sql

# Import ke PostgreSQL lokal
psql -U postgres -d dashboard < backup.sql
```

---

## Perbedaan Penting Vercel vs VPS

| | Vercel | VPS |
|---|---|---|
| **Serverless** | Ya — function cold start | Tidak — server selalu jalan |
| **Cron limit** | 2 cron total (semua project) | Tidak terbatas |
| **Cron interval** | Min 1x per hari (Hobby) | Per menit pun bisa |
| **DB** | Neon (bisa sleep) | PostgreSQL lokal (selalu jalan) |
| **Deploy** | `git push` otomatis | Manual atau setup CI/CD |
| **SSL** | Otomatis | Manual via Certbot |
| **Scaling** | Otomatis | Manual |

---

## Catatan Kode yang Perlu Diperhatikan

### Cron Secret
File: `src/app/api/cron/daily-pnl/route.ts`

```typescript
// Endpoint diproteksi dengan CRON_SECRET
// Di Vercel: otomatis di-inject
// Di VPS: set manual di .env dan kirim via header Authorization
const authHeader = req.headers.get("authorization");
if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) { ... }
```

### Neon Cold Start
Di Vercel + Neon, DB bisa sleep setelah 5 menit idle. Di VPS dengan PostgreSQL lokal, masalah ini hilang.

### next.config.ts
Tidak ada perubahan yang diperlukan — Next.js standalone build kompatibel dengan VPS.

---

## Checklist Migrasi

- [ ] VPS siap (Ubuntu 22.04+, min 1GB RAM)
- [ ] Node.js 20+ terinstall
- [ ] PostgreSQL terinstall atau tetap pakai Neon
- [ ] `.env` sudah diisi semua variable
- [ ] `pnpm build` berhasil
- [ ] PM2 running dan startup configured
- [ ] Nginx configured + SSL aktif
- [ ] Crontab setup dengan CRON_SECRET yang benar
- [ ] Test cron manual: `curl -X POST https://domain/api/cron/daily-pnl -H "Authorization: Bearer SECRET"`
- [ ] Verifikasi data DailyPnl masuk ke DB

---

*Last updated: 2026-07-02*
