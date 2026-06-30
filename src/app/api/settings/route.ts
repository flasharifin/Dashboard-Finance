import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const setting = await db.userSetting.findUnique({ where: { userId: session.user.id } });
  return NextResponse.json({ data: { wealthTarget: Number(setting?.wealthTarget ?? 100_000_000) } });
}

export async function PUT(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const target = Number(body.wealthTarget);
  if (!target || target <= 0) return NextResponse.json({ error: "Target tidak valid" }, { status: 400 });

  const setting = await db.userSetting.upsert({
    where: { userId: session.user.id },
    create: { userId: session.user.id, wealthTarget: target },
    update: { wealthTarget: target },
  });

  return NextResponse.json({ data: { wealthTarget: Number(setting.wealthTarget) } });
}
