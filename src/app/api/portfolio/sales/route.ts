import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const sales = await db.saleTransaction.findMany({
    where: { userId: session.user.id },
    orderBy: { saleDate: "desc" },
  });

  return NextResponse.json({ data: sales });
}
