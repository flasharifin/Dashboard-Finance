import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { dividendSchema } from "@/validations/dividend";
import { calcReceivedAmount } from "@/lib/utils";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const dividends = await db.dividend.findMany({
    where: { userId: session.user.id },
    orderBy: { paymentDate: "desc" },
    include: { portfolio: { select: { lot: true, avgPrice: true } } },
  });

  return NextResponse.json({ data: dividends });
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const parsed = dividendSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }

  const portfolio = await db.portfolio.findFirst({
    where: { id: parsed.data.portfolioId, userId: session.user.id },
  });
  if (!portfolio) {
    return NextResponse.json({ error: "Portfolio tidak ditemukan" }, { status: 404 });
  }

  const receivedAmount = calcReceivedAmount(
    Number(portfolio.lot),
    parsed.data.dps,
    parsed.data.taxPct
  );

  const dividend = await db.dividend.create({
    data: {
      userId: session.user.id,
      portfolioId: parsed.data.portfolioId,
      stockCode: parsed.data.stockCode,
      dps: parsed.data.dps,
      taxPct: parsed.data.taxPct,
      cumDate: parsed.data.cumDate ? new Date(parsed.data.cumDate) : null,
      exDate: parsed.data.exDate ? new Date(parsed.data.exDate) : null,
      paymentDate: parsed.data.paymentDate ? new Date(parsed.data.paymentDate) : null,
      receivedAmount,
      note: parsed.data.note,
    },
  });

  return NextResponse.json({ data: dividend }, { status: 201 });
}
