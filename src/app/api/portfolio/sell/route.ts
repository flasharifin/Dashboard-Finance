import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { z } from "zod";
import { calcUnits } from "@/lib/utils";

const sellSchema = z.object({
  portfolioId: z.string().min(1),
  lotSold: z.number().positive("Jumlah jual harus lebih dari 0"),
  salePrice: z.number().positive("Harga jual harus lebih dari 0"),
  saleDate: z.string().optional(),
  note: z.string().optional().nullable(),
});

export async function POST(req: Request) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const parsed = sellSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });

  const { portfolioId, lotSold, salePrice, saleDate, note } = parsed.data;

  const portfolio = await db.portfolio.findFirst({
    where: { id: portfolioId, userId },
  });
  if (!portfolio) return NextResponse.json({ error: "Portfolio tidak ditemukan" }, { status: 404 });

  const currentLot = Number(portfolio.lot);
  if (lotSold > currentLot + 0.000001) {
    return NextResponse.json({ error: `Maksimal jual: ${currentLot} ${portfolio.exchange === "IDX" ? "lot" : "unit"}` }, { status: 400 });
  }

  const avgCostPrice = Number(portfolio.avgPrice);
  const unitsSold = calcUnits(lotSold, portfolio.exchange);
  const totalProceeds = unitsSold * salePrice;
  const totalCost = unitsSold * avgCostPrice;
  const realizedPnl = totalProceeds - totalCost;

  const [sale] = await db.$transaction(async (tx) => {
    const sale = await tx.saleTransaction.create({
      data: {
        userId,
        stockCode: portfolio.stockCode,
        exchange: portfolio.exchange,
        platform: portfolio.platform,
        currency: portfolio.currency,
        lotSold,
        salePrice,
        avgCostPrice,
        totalProceeds,
        totalCost,
        realizedPnl,
        saleDate: saleDate ? new Date(saleDate) : new Date(),
        note: note ?? null,
      },
    });

    const remainingLot = currentLot - lotSold;
    if (remainingLot < 0.000001) {
      await tx.portfolio.delete({ where: { id: portfolioId } });
    } else {
      await tx.portfolio.update({
        where: { id: portfolioId },
        data: { lot: remainingLot },
      });
    }

    return [sale];
  });

  return NextResponse.json({ data: sale }, { status: 201 });
}
