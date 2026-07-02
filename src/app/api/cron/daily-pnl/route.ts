import { NextResponse } from "next/server";
import { db } from "@/lib/db";

function buildTicker(symbol: string, exchange: string): string {
  switch (exchange) {
    case "IDX":    return `${symbol}.JK`;
    case "US":     return symbol;
    case "CRYPTO": return `${symbol}-USD`;
    default:       return `${symbol}.JK`;
  }
}

async function fetchPrice(symbol: string, exchange: string): Promise<number | null> {
  try {
    const ticker = buildTicker(symbol, exchange);
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${ticker}?interval=1d&range=1d`;
    const res = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0" } });
    if (!res.ok) return null;
    const json = await res.json();
    return json?.chart?.result?.[0]?.meta?.regularMarketPrice ?? null;
  } catch {
    return null;
  }
}

async function fetchUsdToIdr(): Promise<number> {
  try {
    const res = await fetch(
      "https://query1.finance.yahoo.com/v8/finance/chart/USDIDR=X?interval=1d&range=1d",
      { headers: { "User-Agent": "Mozilla/5.0" } }
    );
    if (!res.ok) return 15800;
    const json = await res.json();
    return json?.chart?.result?.[0]?.meta?.regularMarketPrice ?? 15800;
  } catch {
    return 15800;
  }
}

export async function POST(req: Request) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Tanggal hari ini (midnight WIB sudah di-handle oleh jadwal cron 17:00 UTC)
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  const isFirstOfMonth = today.getUTCDate() === 1;

  try {
    const users = await db.user.findMany({ select: { id: true } });
    const usdToIdr = await fetchUsdToIdr();

    for (const user of users) {
      const portfolios = await db.portfolio.findMany({
        where: { userId: user.id, lot: { gt: 0 } },
      });
      if (portfolios.length === 0) continue;

      // Fetch semua harga pasar paralel
      const priceResults = await Promise.allSettled(
        portfolios.map((p) => fetchPrice(p.stockCode, p.exchange))
      );

      // Hitung total nilai portfolio dalam IDR
      let portfolioValue = 0;
      portfolios.forEach((p, i) => {
        const result = priceResults[i];
        const price =
          result.status === "fulfilled" && result.value != null
            ? result.value
            : Number(p.avgPrice);
        const lot = Number(p.lot);
        const valueInCurrency =
          p.exchange === "IDX" ? price * lot * 100 : price * lot;
        const valueIDR =
          p.currency === "IDR" ? valueInCurrency : valueInCurrency * usdToIdr;
        portfolioValue += valueIDR;
      });

      // Ambil record kemarin sebagai basis PnL
      const yesterday = await db.dailyPnl.findFirst({
        where: { userId: user.id },
        orderBy: { date: "desc" },
      });

      const prevValue = yesterday ? Number(yesterday.portfolioValue) : portfolioValue;
      const pnl = portfolioValue - prevValue;
      const pnlPct = prevValue !== 0 ? (pnl / prevValue) * 100 : 0;

      // Simpan/update PnL hari ini
      await db.dailyPnl.upsert({
        where: { userId_date: { userId: user.id, date: today } },
        create: { userId: user.id, date: today, portfolioValue, pnl, pnlPct },
        update: { portfolioValue, pnl, pnlPct },
      });

      // Cleanup setiap tanggal 1: aggregate bulan lalu → MonthlyPnl, hapus daily lama
      if (isFirstOfMonth) {
        const firstOfLastMonth = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth() - 1, 1));
        const lastOfLastMonth  = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), 0));

        const lastMonthRecords = await db.dailyPnl.findMany({
          where: {
            userId: user.id,
            date: { gte: firstOfLastMonth, lte: lastOfLastMonth },
          },
          orderBy: { date: "asc" },
        });

        if (lastMonthRecords.length > 0) {
          const openValue  = Number(lastMonthRecords[0].portfolioValue);
          const closeValue = Number(lastMonthRecords[lastMonthRecords.length - 1].portfolioValue);
          const totalPnl   = closeValue - openValue;
          const monthPnlPct = openValue !== 0 ? (totalPnl / openValue) * 100 : 0;

          await db.monthlyPnl.upsert({
            where: { userId_month: { userId: user.id, month: firstOfLastMonth } },
            create: { userId: user.id, month: firstOfLastMonth, openValue, closeValue, totalPnl, pnlPct: monthPnlPct },
            update: { openValue, closeValue, totalPnl, pnlPct: monthPnlPct },
          });

          await db.dailyPnl.deleteMany({
            where: {
              userId: user.id,
              date: { gte: firstOfLastMonth, lte: lastOfLastMonth },
            },
          });
        }
      }
    }

    return NextResponse.json({ ok: true, processed: users.length, date: today.toISOString() });
  } catch (e) {
    console.error("[cron/daily-pnl]", e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
