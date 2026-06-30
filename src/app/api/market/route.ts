import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

const CACHE_TTL_MS = 15 * 60 * 1000;

function buildTicker(symbol: string, exchange: string): string {
  switch (exchange) {
    case "IDX":    return `${symbol}.JK`;
    case "US":     return symbol;
    case "CRYPTO": return `${symbol}-USD`;
    default:       return `${symbol}.JK`;
  }
}

async function fetchFromYahoo(symbol: string, exchange: string) {
  const ticker = buildTicker(symbol, exchange);
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

async function fetchQuote(symbol: string, exchange: string) {
  // Cek DB cache terlebih dahulu (persists across server restarts)
  const cached = await db.marketPrice.findUnique({
    where: { stockCode_exchange: { stockCode: symbol, exchange } },
  });

  if (cached && Date.now() - cached.fetchedAt.getTime() < CACHE_TTL_MS) {
    return { price: cached.price, change: cached.change, changePercent: cached.changePercent };
  }

  // Fetch segar dari Yahoo Finance
  const fresh = await fetchFromYahoo(symbol, exchange);

  // Jika Yahoo gagal, kembalikan data cache lama daripada null
  if (!fresh) {
    return cached
      ? { price: cached.price, change: cached.change, changePercent: cached.changePercent }
      : null;
  }

  // Simpan/update cache di DB
  await db.marketPrice.upsert({
    where: { stockCode_exchange: { stockCode: symbol, exchange } },
    update: { price: fresh.price, change: fresh.change, changePercent: fresh.changePercent, fetchedAt: new Date() },
    create: { stockCode: symbol, exchange, ...fresh },
  });

  return fresh;
}

// Format: ?assets=BBCA:IDX,AAPL:US,BTC:CRYPTO
export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const assetsParam = searchParams.get("assets") ?? "";
  const pairs = assetsParam
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .map((s) => {
      const [symbol, exchange = "IDX"] = s.split(":");
      return { symbol, exchange };
    });

  if (pairs.length === 0) {
    return NextResponse.json({ error: "assets parameter required" }, { status: 400 });
  }

  const results = await Promise.allSettled(
    pairs.map(({ symbol, exchange }) => fetchQuote(symbol, exchange))
  );

  const data: Record<string, { price: number; change: number; changePercent: number } | null> = {};
  pairs.forEach(({ symbol, exchange }, i) => {
    const key = `${symbol}:${exchange}`;
    const result = results[i];
    data[key] = result.status === "fulfilled" && result.value ? result.value : null;
  });

  return NextResponse.json({ data });
}
