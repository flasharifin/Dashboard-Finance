import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";

const CACHE_TTL = 15 * 60 * 1000;

type QuoteCache = {
  price: number;
  change: number;
  changePercent: number;
  fetchedAt: number;
};

const priceCache = new Map<string, QuoteCache>();

function buildTicker(symbol: string, exchange: string): string {
  switch (exchange) {
    case "IDX":    return `${symbol}.JK`;
    case "US":     return symbol;
    case "CRYPTO": return `${symbol}-USD`;
    default:       return `${symbol}.JK`;
  }
}

async function fetchQuote(symbol: string, exchange: string): Promise<QuoteCache | null> {
  const cacheKey = `${exchange}:${symbol}`;
  const cached = priceCache.get(cacheKey);
  if (cached && Date.now() - cached.fetchedAt < CACHE_TTL) return cached;

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

    const result: QuoteCache = { price, change, changePercent, fetchedAt: Date.now() };
    priceCache.set(cacheKey, result);
    return result;
  } catch {
    return null;
  }
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
    data[key] =
      result.status === "fulfilled" && result.value
        ? {
            price: result.value.price,
            change: result.value.change,
            changePercent: result.value.changePercent,
          }
        : null;
  });

  return NextResponse.json({ data });
}
