import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const s = await db.userSetting.findUnique({ where: { userId: session.user.id } });
  return NextResponse.json({
    data: {
      wealthTarget:       Number(s?.wealthTarget       ?? 100_000_000),
      goalName:           s?.goalName           ?? null,
      goalDeadline:       s?.goalDeadline?.toISOString() ?? null,
      goalReturnPct:      Number(s?.goalReturnPct      ?? 12),
      goalMonthlyContrib: s?.goalMonthlyContrib != null ? Number(s.goalMonthlyContrib) : null,
    },
  });
}

export async function PUT(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));

  const data: Record<string, unknown> = {};

  if (body.wealthTarget != null) {
    const v = Number(body.wealthTarget);
    if (!v || v <= 0) return NextResponse.json({ error: "Target tidak valid" }, { status: 400 });
    data.wealthTarget = v;
  }
  if ("goalName" in body)           data.goalName           = body.goalName ?? null;
  if ("goalDeadline" in body)       data.goalDeadline       = body.goalDeadline ? new Date(body.goalDeadline) : null;
  if ("goalReturnPct" in body)      data.goalReturnPct      = body.goalReturnPct != null ? Number(body.goalReturnPct) : null;
  if ("goalMonthlyContrib" in body) data.goalMonthlyContrib = body.goalMonthlyContrib != null ? Number(body.goalMonthlyContrib) : null;

  if (Object.keys(data).length === 0)
    return NextResponse.json({ error: "Tidak ada data yang diupdate" }, { status: 400 });

  const s = await db.userSetting.upsert({
    where:  { userId: session.user.id },
    create: { userId: session.user.id, ...data },
    update: data,
  });

  return NextResponse.json({
    data: {
      wealthTarget:       Number(s.wealthTarget),
      goalName:           s.goalName ?? null,
      goalDeadline:       s.goalDeadline?.toISOString() ?? null,
      goalReturnPct:      Number(s.goalReturnPct ?? 12),
      goalMonthlyContrib: s.goalMonthlyContrib != null ? Number(s.goalMonthlyContrib) : null,
    },
  });
}
