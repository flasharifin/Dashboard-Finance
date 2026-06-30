import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import type { Asset, Liability } from "@prisma/client";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const snapshots = await db.netWorthSnapshot.findMany({
    where: { userId: session.user.id },
    orderBy: { snapshotDate: "asc" },
    take: 120,
  });

  return NextResponse.json({ data: snapshots });
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const portfolioValueIDR = Number(body.portfolioValueIDR ?? 0);

  const [assets, liabilities] = await Promise.all([
    db.asset.findMany({ where: { userId: session.user.id } }),
    db.liability.findMany({ where: { userId: session.user.id } }),
  ]);

  const manualAssets = assets.reduce((sum: number, a: Asset) => sum + Number(a.value), 0);
  const totalAssets = portfolioValueIDR + manualAssets;
  const totalLiabilities = liabilities.reduce((sum: number, l: Liability) => sum + Number(l.amount), 0);
  const netValue = totalAssets - totalLiabilities;

  // Fetch benchmark prices for historical comparison
  async function fetchBenchmarkPrice(ticker: string): Promise<number | undefined> {
    try {
      const url = `https://query1.finance.yahoo.com/v8/finance/chart/${ticker}?interval=1d&range=1d`;
      const res = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0" } });
      if (!res.ok) return undefined;
      const json = await res.json();
      return json?.chart?.result?.[0]?.meta?.regularMarketPrice ?? undefined;
    } catch { return undefined; }
  }

  const [ihsgResult, sp500Result] = await Promise.allSettled([
    fetchBenchmarkPrice("%5EJKSE"),
    fetchBenchmarkPrice("%5EGSPC"),
  ]);

  const snapshot = await db.netWorthSnapshot.create({
    data: {
      userId: session.user.id,
      totalAssets,
      totalLiabilities,
      netValue,
      portfolioValue: portfolioValueIDR > 0 ? portfolioValueIDR : undefined,
      benchmarkIhsg: ihsgResult.status === "fulfilled" ? ihsgResult.value : undefined,
      benchmarkSp500: sp500Result.status === "fulfilled" ? sp500Result.value : undefined,
    },
  });

  return NextResponse.json({ data: snapshot }, { status: 201 });
}
