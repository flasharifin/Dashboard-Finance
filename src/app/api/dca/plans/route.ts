import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { z } from "zod";

const schema = z.object({
  portfolioId: z.string().min(1),
  stockCode: z.string().min(1),
  targetPrice: z.number().positive(),
  budget: z.number().positive(),
  frequency: z.enum(["weekly", "monthly", "custom"]).default("monthly"),
  nextDate: z.string().optional().nullable(),
  note: z.string().optional(),
});

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const plans = await db.dcaPlan.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({ data: plans });
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });

  const { portfolioId, stockCode, targetPrice, budget, frequency, nextDate, note } = parsed.data;

  const plan = await db.dcaPlan.create({
    data: {
      userId: session.user.id,
      portfolioId,
      stockCode,
      targetPrice,
      budget,
      frequency,
      nextDate: nextDate ? new Date(nextDate) : null,
      note,
      isActive: true,
    },
  });
  return NextResponse.json({ data: plan }, { status: 201 });
}
