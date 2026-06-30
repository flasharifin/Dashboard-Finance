import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import type { Asset, Liability } from "@prisma/client";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [assets, liabilities] = await Promise.all([
    db.asset.findMany({ where: { userId: session.user.id } }),
    db.liability.findMany({ where: { userId: session.user.id } }),
  ]);

  const totalAssets = assets.reduce((sum: number, a: Asset) => sum + Number(a.value), 0);
  const totalLiabilities = liabilities.reduce((sum: number, l: Liability) => sum + Number(l.amount), 0);
  const netValue = totalAssets - totalLiabilities;

  return NextResponse.json({
    data: { totalAssets, totalLiabilities, netValue, assets, liabilities },
  });
}
