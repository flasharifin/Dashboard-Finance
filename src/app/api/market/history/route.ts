import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";

function buildTicker(symbol: string, exchange: string): string {
  switch (exchange) {
    case "IDX":    return `${symbol}.JK`;
    case "US":     return symbol;
    case "CRYPTO": return `${symbol}-USD`;
    default:       return symbol;
  }
}

async function fetchHistory(
  symbol: string,
  exchange: string
): Promise<{ date: string; close: number }[] | null> {
  const ticker = buildTicker(symbol, exchange);
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${ticker}?interval=1d&range=1mo`;
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0" },
      next: { revalidate: 3600 },
    });
    if (!res.ok) return null;
    const json = await res.json();
    const result = json?.chart?.result?.[0];
    if (!result) return null;

    const timestamps: number[] = result.timestamp ?? [];
    const closes: (number | null)[] = result.indicators?.quote?.[0]?.close ?? [];

    return timestamps
      .map((ts, i) => ({
        date: new Date(ts * 1000).toISOString().split("T")[0],
        close: closes[i],
      }))
      .filter((d): d is { date: string; close: number } =>
        d.close != null && !isNaN(d.close)
      );
  } catch {
    return null;
  }
}

// GET /api/market/history?assets=BBCA:IDX,AAPL:US,BTC:CRYPTO
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
    pairs.map(({ symbol, exchange }) => fetchHistory(symbol, exchange))
  );

  const data: Record<string, { date: string; close: number }[] | null> = {};
  pairs.forEach(({ symbol, exchange }, i) => {
    const key = `${symbol}:${exchange}`;
    const result = results[i];
    data[key] = result.status === "fulfilled" ? result.value : null;
  });

  return NextResponse.json({ data });
}
