import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { assetSchema } from "@/validations/networth";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const assets = await db.asset.findMany({
    where: { userId: session.user.id },
    orderBy: { category: "asc" },
  });

  return NextResponse.json({ data: assets });
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const parsed = assetSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }

  const asset = await db.asset.create({
    data: { userId: session.user.id, ...parsed.data },
  });

  return NextResponse.json({ data: asset }, { status: 201 });
}
