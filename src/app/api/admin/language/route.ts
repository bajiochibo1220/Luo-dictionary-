import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  if (!(session.user as any).isSuperAdmin) return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });

  const body = await req.json().catch(() => ({}));
  const languageId = Number(body.languageId);
  if (!Number.isInteger(languageId) || languageId < 1) {
    return NextResponse.json({ success: false, error: "Choose a valid language" }, { status: 400 });
  }
  const language = await prisma.language.findUnique({ where: { id: languageId }, select: { id: true } });
  if (!language) return NextResponse.json({ success: false, error: "Language not found" }, { status: 404 });

  const response = NextResponse.json({ success: true });
  response.cookies.set("admin-language-id", String(language.id), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });
  return response;
}

export async function PUT(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  if (!(session.user as any).isSuperAdmin) return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
  const body = await req.json().catch(() => ({}));
  const rawId = body.cultureId;
  const response = NextResponse.json({ success: true });
  if (rawId === null || rawId === "all" || rawId === 0) {
    response.cookies.set("admin-culture-id", "", { path: "/", maxAge: 0 });
    return response;
  }
  const cultureId = Number(rawId);
  if (!Number.isInteger(cultureId) || cultureId < 1) return NextResponse.json({ success: false, error: "Choose a valid culture" }, { status: 400 });
  const language = await prisma.language.findUnique({ where: { id: cultureId }, select: { id: true } });
  if (!language) return NextResponse.json({ success: false, error: "Culture not found" }, { status: 404 });
  response.cookies.set("admin-culture-id", String(language.id), {
    httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 60 * 60 * 24 * 365,
  });
  return response;
}
