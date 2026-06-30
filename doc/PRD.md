# PRD — Dashboard Assets & Portfolio Tracker

## 1. Overview

Aplikasi web personal untuk memantau portofolio saham, merencanakan strategi DCA, melacak dividen yang diterima, dan menghitung net value aset secara keseluruhan. Dirancang untuk deployment awal di Vercel dan migrasi seamless ke VPS.

---

## 2. Goals

- Satu tempat untuk melihat kesehatan finansial secara keseluruhan
- Meminimalkan input manual lewat otomasi harga saham
- Mendukung keputusan investasi berbasis data (DCA, yield, net worth)
- Codebase yang mudah di-maintain dan di-migrate antar environment

---

## 3. User Stories

### 3.1 Portfolio Tracker
- Sebagai user, saya bisa menambah/edit/hapus posisi saham (kode, lot, harga beli rata-rata)
- Sebagai user, saya bisa melihat harga pasar terkini dan perubahan harga (% gain/loss)
- Sebagai user, saya bisa melihat total value portofolio dan unrealized P&L per emiten
- Sebagai user, saya bisa melihat alokasi portofolio dalam bentuk pie chart

### 3.2 DCA Planner
- Sebagai user, saya bisa mengatur target harga beli dan jadwal DCA per emiten
- Sebagai user, saya bisa mensimulasi rata-rata harga beli baru jika menambah lot pada harga tertentu
- Sebagai user, saya bisa melihat rekomendasi jumlah lot berdasarkan budget yang ditentukan
- Sebagai user, saya bisa mencatat histori pembelian DCA

### 3.3 Dividend Tracker
- Sebagai user, saya bisa mencatat dividen yang diterima (emiten, tanggal, jumlah per lembar, pajak)
- Sebagai user, saya bisa melihat dividend yield per emiten (yield = DPS / harga beli rata-rata × 100)
- Sebagai user, saya bisa melihat total dividen yang diterima per tahun/kuartal
- Sebagai user, saya bisa melihat proyeksi dividen berdasarkan histori dan posisi saat ini
- Sebagai user, saya bisa mencatat cum date dan ex-date setiap emiten

### 3.4 Net Value Calculator (Net Worth Tracker)
- Sebagai user, saya bisa mencatat semua aset (portofolio saham, tabungan, properti, dll)
- Sebagai user, saya bisa mencatat semua hutang (KPR, KTA, kartu kredit, dll)
- Sebagai user, saya bisa melihat Net Value = Total Aset − Total Hutang
- Sebagai user, saya bisa melihat tren net value dari waktu ke waktu (snapshot bulanan)

### 3.5 Dashboard & Reporting
- Sebagai user, saya bisa melihat ringkasan semua metrics di halaman utama
- Sebagai user, saya bisa melihat chart performa portofolio vs waktu
- Sebagai user, saya bisa export data ke CSV/Excel

---

## 4. Fitur Detail

### Module: Portfolio

| Field           | Tipe     | Keterangan                              |
|----------------|----------|-----------------------------------------|
| stock_code      | string   | Kode emiten (BBCA, TLKM, dll)          |
| lot             | integer  | Jumlah lot (1 lot = 100 lembar)         |
| avg_price       | decimal  | Harga beli rata-rata per lembar         |
| market_price    | decimal  | Harga pasar terkini (auto-fetch)        |
| sector          | string   | Sektor industri                         |
| note            | text     | Catatan pribadi                         |

Kalkulasi otomatis:
- `total_cost = lot × 100 × avg_price`
- `market_value = lot × 100 × market_price`
- `unrealized_pnl = market_value - total_cost`
- `unrealized_pnl_pct = (unrealized_pnl / total_cost) × 100`

### Module: DCA Planner

| Field           | Tipe     | Keterangan                              |
|----------------|----------|-----------------------------------------|
| stock_code      | string   | Kode emiten                             |
| target_price    | decimal  | Target harga beli DCA                  |
| budget          | decimal  | Budget yang dialokasikan                |
| frequency       | enum     | weekly / monthly / custom              |
| next_date       | date     | Jadwal DCA berikutnya                  |

Kalkulator DCA:
- Input: harga beli baru + jumlah lot baru
- Output: rata-rata harga beli baru, total lot, total investasi

### Module: Dividend

| Field           | Tipe     | Keterangan                              |
|----------------|----------|-----------------------------------------|
| stock_code      | string   | Kode emiten                             |
| dps             | decimal  | Dividend per share (sebelum pajak)      |
| tax_pct         | decimal  | Persentase pajak (default 10%)          |
| cum_date        | date     | Tanggal cum dividend                    |
| ex_date         | date     | Tanggal ex dividend                     |
| payment_date    | date     | Tanggal pembayaran                      |
| received_amount | decimal  | Total yang diterima (calculated)        |

Kalkulasi:
- `net_dps = dps × (1 - tax_pct / 100)`
- `received_amount = lot × 100 × net_dps`
- `dividend_yield = (dps / avg_price) × 100`

### Module: Net Worth

Aset:
- Portofolio saham (auto-sync dari module portfolio)
- Cash & tabungan
- Reksa dana
- Properti
- Aset lainnya

Hutang:
- KPR / cicilan properti
- KTA / pinjaman pribadi
- Kartu kredit
- Hutang lainnya

Kalkulasi:
- `net_value = total_assets - total_liabilities`
- Snapshot disimpan per bulan untuk tracking tren

---

## 5. Tech Stack

### Layer: Frontend
| Teknologi       | Versi  | Alasan                                                        |
|----------------|--------|---------------------------------------------------------------|
| Next.js         | 15+    | SSR/SSG built-in, Vercel-native, file-based routing           |
| TypeScript      | 5+     | Type safety, maintainability, auto-complete                   |
| Tailwind CSS    | 4+     | Utility-first, no CSS bloat, mudah di-maintain                |
| shadcn/ui       | latest | Komponen aksesibel berbasis Radix UI, bisa di-copy ke codebase|
| Recharts        | 2+     | Chart library ringan, composable, TypeScript-friendly         |
| TanStack Query  | 5+     | Server state management, caching, background refetch          |
| Zustand         | 5+     | Client state management, minimal boilerplate                  |

### Layer: Backend
| Teknologi       | Versi  | Alasan                                                        |
|----------------|--------|---------------------------------------------------------------|
| Next.js API Routes | —  | Awalnya cukup, satu repo, zero config di Vercel               |
| Zod             | 3+     | Schema validation request/response                            |
| Prisma ORM      | 5+     | Type-safe DB access, auto-migration, mudah pindah DB          |

> Ketika pindah ke VPS: ekstrak API ke **Fastify** atau **NestJS** di repo terpisah,
> frontend tinggal update `NEXT_PUBLIC_API_URL`. Zero refactor di sisi logic.

### Layer: Database
| Environment    | Database       | Alasan                                                     |
|----------------|----------------|------------------------------------------------------------|
| Vercel (dev/prod) | Neon Postgres | Serverless PostgreSQL, free tier, sama dengan self-hosted |
| VPS            | PostgreSQL      | Self-hosted, full control, same schema via Prisma          |

> Karena pakai Prisma, migrasi dari Neon ke self-hosted Postgres = ganti `DATABASE_URL` saja.

### Layer: Auth
| Teknologi   | Keterangan                                                        |
|-------------|-------------------------------------------------------------------|
| Auth.js v5  | Support credential + OAuth (Google), session-based, edge-ready   |

### Layer: Data Saham (Harga Market)
| Opsi               | Keterangan                                                   |
|--------------------|--------------------------------------------------------------|
| Yahoo Finance (yfinance-style) | Fetch via API Route sebagai proxy, gratis          |
| Stooq.com          | Alternatif untuk saham IDX                                   |
| Input manual       | Fallback jika API tidak tersedia                             |

> Harga di-cache di DB selama 15 menit untuk menghindari rate limit.

### Layer: Deployment
| Phase     | Platform   | Setup                                           |
|-----------|------------|-------------------------------------------------|
| Awal      | Vercel     | Connect GitHub repo, auto-deploy, Neon DB       |
| Lanjutan  | VPS (Ubuntu) | Docker Compose: Next.js + PostgreSQL + Nginx  |

### DevOps & Tooling
| Teknologi       | Keterangan                             |
|----------------|----------------------------------------|
| pnpm            | Package manager, lebih cepat dari npm  |
| ESLint + Prettier | Code quality & formatting            |
| Husky + lint-staged | Pre-commit hooks                  |
| Docker + Docker Compose | Untuk VPS deployment            |
| GitHub Actions  | CI/CD pipeline                         |

---

## 6. Struktur Folder (Monorepo-ready)

```
dashboard-assets/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── (auth)/             # Route group: login, register
│   │   ├── (dashboard)/        # Route group: semua halaman utama
│   │   │   ├── portfolio/
│   │   │   ├── dca/
│   │   │   ├── dividends/
│   │   │   └── networth/
│   │   └── api/                # API Routes
│   │       ├── portfolio/
│   │       ├── dividends/
│   │       ├── networth/
│   │       └── market/         # Proxy harga saham
│   ├── components/
│   │   ├── ui/                 # shadcn/ui components
│   │   ├── charts/             # Recharts wrappers
│   │   └── features/           # Feature-specific components
│   ├── lib/
│   │   ├── db.ts               # Prisma client singleton
│   │   ├── auth.ts             # Auth.js config
│   │   └── utils.ts            # Shared utilities
│   ├── hooks/                  # Custom React hooks
│   ├── stores/                 # Zustand stores
│   ├── types/                  # TypeScript type definitions
│   └── validations/            # Zod schemas
├── prisma/
│   ├── schema.prisma
│   └── migrations/
├── public/
├── .env.local                  # Tidak di-commit
├── .env.example                # Template env vars
├── docker-compose.yml          # Untuk VPS
├── Dockerfile
└── next.config.ts
```

---

## 7. Database Schema (High-Level)

```prisma
model User {
  id        String   @id @default(cuid())
  email     String   @unique
  name      String?
  createdAt DateTime @default(now())

  portfolios   Portfolio[]
  dividends    Dividend[]
  dcaPlans     DcaPlan[]
  assets       Asset[]
  liabilities  Liability[]
  netWorthSnapshots NetWorthSnapshot[]
}

model Portfolio {
  id        String   @id @default(cuid())
  userId    String
  stockCode String
  lot       Int
  avgPrice  Decimal
  sector    String?
  note      String?
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  user      User       @relation(fields: [userId], references: [id])
  dividends Dividend[]
  dcaPlans  DcaPlan[]

  @@unique([userId, stockCode])
}

model Dividend {
  id            String   @id @default(cuid())
  userId        String
  portfolioId   String
  stockCode     String
  dps           Decimal
  taxPct        Decimal  @default(10)
  cumDate       DateTime?
  exDate        DateTime?
  paymentDate   DateTime?
  createdAt     DateTime @default(now())

  user      User      @relation(fields: [userId], references: [id])
  portfolio Portfolio @relation(fields: [portfolioId], references: [id])
}

model DcaPlan {
  id          String   @id @default(cuid())
  userId      String
  portfolioId String
  stockCode   String
  targetPrice Decimal
  budget      Decimal
  frequency   String
  nextDate    DateTime?
  isActive    Boolean  @default(true)
  createdAt   DateTime @default(now())

  user      User      @relation(fields: [userId], references: [id])
  portfolio Portfolio @relation(fields: [portfolioId], references: [id])
}

model Asset {
  id        String   @id @default(cuid())
  userId    String
  name      String
  category  String   // cash, stock, property, other
  value     Decimal
  note      String?
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  user User @relation(fields: [userId], references: [id])
}

model Liability {
  id        String   @id @default(cuid())
  userId    String
  name      String
  category  String   // mortgage, personal_loan, credit_card, other
  amount    Decimal
  note      String?
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  user User @relation(fields: [userId], references: [id])
}

model NetWorthSnapshot {
  id           String   @id @default(cuid())
  userId       String
  totalAssets  Decimal
  totalLiabilities Decimal
  netValue     Decimal
  snapshotDate DateTime @default(now())

  user User @relation(fields: [userId], references: [id])
}
```

---

## 8. Roadmap

### Phase 1 — MVP (Vercel)
- [ ] Setup project (Next.js + TypeScript + Tailwind + Prisma + Neon)
- [ ] Auth (login/register dengan credentials)
- [ ] Portfolio CRUD + kalkulasi P&L
- [ ] Dividend CRUD + kalkulasi yield
- [ ] Net Worth input manual + kalkulasi net value
- [ ] Dashboard halaman utama dengan summary cards

### Phase 2 — Enhancement (Vercel)
- [ ] DCA Planner + kalkulator simulasi
- [ ] Fetch harga pasar otomatis (Yahoo Finance proxy)
- [ ] Chart: performa portofolio, tren net worth, dividen per tahun
- [ ] Export CSV
- [ ] Net Worth snapshot bulanan otomatis

### Phase 3 — Scale (VPS)
- [ ] Migrasi DB ke self-hosted PostgreSQL
- [ ] Pisah API ke service terpisah (Fastify/NestJS) jika diperlukan
- [ ] Notifikasi (dividen masuk, DCA reminder) via email/Telegram
- [ ] Multi-currency support
- [ ] Import data dari broker (CSV format)
- [ ] Mobile-responsive PWA

---

## 9. Environment Variables

```env
# Database
DATABASE_URL="postgresql://..."

# Auth
AUTH_SECRET="..."
AUTH_URL="http://localhost:3000"

# App
NEXT_PUBLIC_APP_URL="http://localhost:3000"

# Market Data (opsional)
MARKET_API_KEY="..."
```

---

## 10. Keputusan Arsitektur Utama

| Keputusan | Pilihan | Alasan |
|-----------|---------|--------|
| Monolith vs Microservice | Monolith (Next.js fullstack) | Lebih simpel untuk awal, mudah di-split nanti |
| ORM | Prisma | Type-safe, migration-first, support multi DB |
| Database | PostgreSQL | Relational, battle-tested, Prisma support penuh |
| UI Component | shadcn/ui | Code dimiliki sendiri, tidak vendor-lock, aksesibel |
| State Management | TanStack Query + Zustand | Server state terpisah dari client state |
| Styling | Tailwind CSS | Maintainable, no CSS drift, responsive built-in |

---

*Dokumen ini adalah living document — update sesuai perkembangan kebutuhan.*
