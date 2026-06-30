import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";

const CACHE_TTL = 15 * 60 * 1000; // 15 menit

const priceCache = new Map<string, { price: number; change: number; changePercent: number; fetchedAt: number }>();

async function fetchQuote(symbol: string) {
  const cached = priceCache.get(symbol);
  if (cached && Date.now() - cached.fetchedAt < CACHE_TTL) {
    return cached;
  }

  // Saham IDX: tambahkan suffix .JK untuk Yahoo Finance
  const ticker = symbol.endsWith(".JK") ? symbol : `${symbol}.JK`;
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${ticker}?interval=1d&range=1d`;

  const res = await fetch(url, {
    headers: { "User-Agent": "Mozilla/5.0" },
    next: { revalidate: 0 },
  });

  if (!res.ok) return null;

  const json = await res.json();
  const meta = json?.chart?.result?.[0]?.meta;
  if (!meta) return null;

  const price = meta.regularMarketPrice ?? 0;
  const prevClose = meta.chartPreviousClose ?? price;
  const change = price - prevClose;
  const changePercent = prevClose !== 0 ? (change / prevClose) * 100 : 0;

  const result = { price, change, changePercent, fetchedAt: Date.now() };
  priceCache.set(symbol, result);
  return result;
}

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const symbols = searchParams.get("symbols")?.split(",").filter(Boolean) ?? [];

  if (symbols.length === 0) {
    return NextResponse.json({ error: "symbols parameter required" }, { status: 400 });
  }

  const results = await Promise.allSettled(symbols.map((s) => fetchQuote(s)));

  const data: Record<string, { price: number; change: number; changePercent: number } | null> = {};
  symbols.forEach((symbol, i) => {
    const result = results[i];
    data[symbol] = result.status === "fulfilled" && result.value
      ? { price: result.value.price, change: result.value.change, changePercent: result.value.changePercent }
      : null;
  });

  return NextResponse.json({ data });
}
