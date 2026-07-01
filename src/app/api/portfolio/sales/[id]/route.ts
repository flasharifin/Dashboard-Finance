import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const existing = await db.saleTransaction.findFirst({ where: { id, userId } });
  if (!existing) return NextResponse.json({ error: "Histori jual tidak ditemukan" }, { status: 404 });

  await db.saleTransaction.delete({ where: { id } });
  return NextResponse.json({ data: { id } });
}
