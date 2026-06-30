import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { liabilitySchema } from "@/validations/networth";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const liabilities = await db.liability.findMany({
    where: { userId: session.user.id },
    orderBy: { category: "asc" },
  });

  return NextResponse.json({ data: liabilities });
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const parsed = liabilitySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }

  const liability = await db.liability.create({
    data: { userId: session.user.id, ...parsed.data },
  });

  return NextResponse.json({ data: liability }, { status: 201 });
}
