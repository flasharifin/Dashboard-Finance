import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { portfolioSchema } from "@/validations/portfolio";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const portfolios = await db.portfolio.findMany({
    where: { userId: session.user.id },
    orderBy: { stockCode: "asc" },
  });

  return NextResponse.json({ data: portfolios });
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const parsed = portfolioSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }

  const portfolio = await db.portfolio.upsert({
    where: {
      userId_stockCode: {
        userId: session.user.id,
        stockCode: parsed.data.stockCode,
      },
    },
    update: {
      lot: parsed.data.lot,
      avgPrice: parsed.data.avgPrice,
      sector: parsed.data.sector,
      note: parsed.data.note,
    },
    create: {
      userId: session.user.id,
      ...parsed.data,
    },
  });

  return NextResponse.json({ data: portfolio }, { status: 201 });
}
