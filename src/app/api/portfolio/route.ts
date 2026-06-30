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

  const { purchaseDate, ...rest } = parsed.data;
  const parsedPurchaseDate = purchaseDate ? new Date(purchaseDate) : undefined;
  const portfolio = await db.portfolio.upsert({
    where: {
      userId_stockCode_platform: {
        userId: session.user.id,
        stockCode: parsed.data.stockCode,
        platform: parsed.data.platform ?? "",
      },
    },
    update: {
      lot: rest.lot,
      avgPrice: rest.avgPrice,
      sector: rest.sector,
      note: rest.note,
      ...(parsedPurchaseDate !== undefined ? { purchaseDate: parsedPurchaseDate } : {}),
    },
    create: {
      userId: session.user.id,
      ...rest,
      ...(parsedPurchaseDate !== undefined ? { purchaseDate: parsedPurchaseDate } : {}),
    },
  });

  return NextResponse.json({ data: portfolio }, { status: 201 });
}
