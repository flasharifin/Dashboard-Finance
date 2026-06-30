import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";

const CACHE_TTL = 60 * 60 * 1000; // 1 jam

let rateCache: { USDIDR: number; fetchedAt: number } | null = null;

async function fetchUSDIDR(): Promise<number> {
  if (rateCache && Date.now() - rateCache.fetchedAt < CACHE_TTL) {
    return rateCache.USDIDR;
  }

  try {
    const url =
      "https://query1.finance.yahoo.com/v8/finance/chart/USDIDR=X?interval=1d&range=1d";
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0" },
      next: { revalidate: 0 },
    });
    if (!res.ok) throw new Error("fetch failed");

    const json = await res.json();
    const price: number = json?.chart?.result?.[0]?.meta?.regularMarketPrice ?? 16000;
    rateCache = { USDIDR: price, fetchedAt: Date.now() };
    return price;
  } catch {
    return rateCache?.USDIDR ?? 16000;
  }
}

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const USDIDR = await fetchUSDIDR();
  return NextResponse.json({
    data: { USDIDR, updatedAt: new Date().toISOString() },
  });
}
