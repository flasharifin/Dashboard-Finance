import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { z } from "zod";

const schema = z.object({
  targetPrice: z.number().positive().optional(),
  budget: z.number().positive().optional(),
  frequency: z.enum(["weekly", "monthly", "custom"]).optional(),
  nextDate: z.string().optional().nullable(),
  isActive: z.boolean().optional(),
  note: z.string().optional(),
});

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });

  const existing = await db.dcaPlan.findFirst({ where: { id, userId: session.user.id } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const updated = await db.dcaPlan.update({
    where: { id },
    data: {
      ...parsed.data,
      nextDate: parsed.data.nextDate ? new Date(parsed.data.nextDate) : parsed.data.nextDate,
    },
  });
  return NextResponse.json({ data: updated });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const existing = await db.dcaPlan.findFirst({ where: { id, userId: session.user.id } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await db.dcaPlan.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
