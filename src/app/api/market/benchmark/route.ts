import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

const CACHE_TTL_MS = 15 * 60 * 1000;

const BENCHMARKS = [
  { key: "IHSG", ticker: "%5EJKSE" },
  { key: "SP500", ticker: "%5EGSPC" },
] as const;

async function fetchBenchmark(ticker: string) {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${ticker}?interval=1d&range=1d`;
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0" },
      next: { revalidate: 0 },
    });
    if (!res.ok) return null;
    const json = await res.json();
    const meta = json?.chart?.result?.[0]?.meta;
    if (!meta) return null;
    const price: number = meta.regularMarketPrice ?? 0;
    const prevClose: number = meta.chartPreviousClose ?? price;
    const change = price - prevClose;
    const changePercent = prevClose !== 0 ? (change / prevClose) * 100 : 0;
    return { price, change, changePercent };
  } catch {
    return null;
  }
}

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const result: Record<string, { price: number; change: number; changePercent: number } | null> = {};

  await Promise.allSettled(
    BENCHMARKS.map(async ({ key, ticker }) => {
      // Try DB cache first (reuse MarketPrice table)
      const cached = await db.marketPrice.findUnique({
        where: { stockCode_exchange: { stockCode: key, exchange: "BENCHMARK" } },
      });

      if (cached && Date.now() - cached.fetchedAt.getTime() < CACHE_TTL_MS) {
        result[key] = { price: cached.price, change: cached.change, changePercent: cached.changePercent };
        return;
      }

      const fresh = await fetchBenchmark(ticker);
      if (fresh) {
        await db.marketPrice.upsert({
          where: { stockCode_exchange: { stockCode: key, exchange: "BENCHMARK" } },
          update: { price: fresh.price, change: fresh.change, changePercent: fresh.changePercent, fetchedAt: new Date() },
          create: { stockCode: key, exchange: "BENCHMARK", ...fresh },
        });
        result[key] = fresh;
      } else if (cached) {
        result[key] = { price: cached.price, change: cached.change, changePercent: cached.changePercent };
      } else {
        result[key] = null;
      }
    })
  );

  return NextResponse.json({ data: result });
}
