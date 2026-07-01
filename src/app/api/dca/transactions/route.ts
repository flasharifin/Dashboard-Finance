import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { z } from "zod";
import { calcAvgPrice, calcUnits } from "@/lib/utils";

const schema = z.object({
  portfolioId: z.string().min(1),
  stockCode: z.string().min(1),
  dcaPlanId: z.string().optional().nullable(),
  lot: z.number().positive(),
  price: z.number().positive(),
  buyDate: z.string().optional(),
  note: z.string().optional(),
});

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const txs = await db.dcaTransaction.findMany({
    where: { userId: session.user.id },
    orderBy: { buyDate: "desc" },
  });
  return NextResponse.json({ data: txs });
}

export async function POST(req: Request) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });

  const { portfolioId, stockCode, dcaPlanId, lot, price, buyDate, note } = parsed.data;

  const portfolio = await db.portfolio.findFirst({ where: { id: portfolioId, userId } });
  if (!portfolio) return NextResponse.json({ error: "Portfolio tidak ditemukan" }, { status: 404 });

  const currentLot = Number(portfolio.lot);
  const currentAvgPrice = Number(portfolio.avgPrice);
  const totalCost = calcUnits(lot, portfolio.exchange) * price;

  const [tx] = await db.$transaction(async (prisma) => {
    const tx = await prisma.dcaTransaction.create({
      data: {
        userId,
        portfolioId,
        stockCode,
        dcaPlanId: dcaPlanId ?? null,
        lot,
        price,
        totalCost,
        buyDate: buyDate ? new Date(buyDate) : new Date(),
        note,
      },
    });

    const newLot = currentLot + lot;
    const newAvgPrice = calcAvgPrice(currentLot, currentAvgPrice, lot, price);
    await prisma.portfolio.update({
      where: { id: portfolioId },
      data: { lot: newLot, avgPrice: newAvgPrice },
    });

    return [tx];
  });

  return NextResponse.json({ data: tx }, { status: 201 });
}
