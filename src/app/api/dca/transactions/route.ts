import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { z } from "zod";

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
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });

  const { portfolioId, stockCode, dcaPlanId, lot, price, buyDate, note } = parsed.data;
  const totalCost = lot * price;

  const tx = await db.dcaTransaction.create({
    data: {
      userId: session.user.id,
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
  return NextResponse.json({ data: tx }, { status: 201 });
}
