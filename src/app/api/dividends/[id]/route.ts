import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { dividendSchema } from "@/validations/dividend";
import { calcReceivedAmount } from "@/lib/utils";

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const existing = await db.dividend.findFirst({ where: { id, userId: session.user.id } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await db.dividend.delete({ where: { id } });
  return NextResponse.json({ data: { id } });
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const existing = await db.dividend.findFirst({
    where: { id, userId: session.user.id },
    include: { portfolio: { select: { lot: true } } },
  });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json();
  const parsed = dividendSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }

  const receivedAmount = calcReceivedAmount(
    existing.portfolio.lot,
    parsed.data.dps,
    parsed.data.taxPct
  );

  const updated = await db.dividend.update({
    where: { id },
    data: {
      dps: parsed.data.dps,
      taxPct: parsed.data.taxPct,
      cumDate: parsed.data.cumDate ? new Date(parsed.data.cumDate) : null,
      exDate: parsed.data.exDate ? new Date(parsed.data.exDate) : null,
      paymentDate: parsed.data.paymentDate ? new Date(parsed.data.paymentDate) : null,
      receivedAmount,
      note: parsed.data.note,
    },
  });

  return NextResponse.json({ data: updated });
}
