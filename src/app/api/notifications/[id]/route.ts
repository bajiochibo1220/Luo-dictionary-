import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function PATCH(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const result = await prisma.notification.updateMany({
    where: { id: Number(params.id), userId: (session.user as any).id },
    data: { read: true },
  });

  if (result.count === 0) {
    return NextResponse.json({ success: false, error: "Notification not found" }, { status: 404 });
  }

  return NextResponse.json({ success: true });
}
