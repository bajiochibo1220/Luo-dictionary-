import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { logAction } from "@/lib/audit";

export const dynamic = "force-dynamic";
const ADMIN_ROLES = ["language_admin", "moderator", "content_editor", "cultural_expert"];

export async function GET() {
  const session = await auth();
  if (!session?.user?.isSuperAdmin) return NextResponse.json({ error: "Forbidden" }, { status: session?.user ? 403 : 401 });
  const admins = await prisma.user.findMany({
    where: { OR: [{ isSuperAdmin: true }, { languageRoles: { some: { role: { in: ADMIN_ROLES } } } }] },
    orderBy: { createdAt: "desc" },
    select: { id: true, email: true, name: true, isSuperAdmin: true, isMasterSuperAdmin: true, status: true, createdAt: true, languageRoles: { select: { id: true, role: true, language: { select: { code: true, nativeName: true } } } } },
  });
  return NextResponse.json({ success: true, data: admins });
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.isSuperAdmin) return NextResponse.json({ error: "Forbidden" }, { status: session?.user ? 403 : 401 });
    const master = session.user.isMasterSuperAdmin;
    const body = await req.json();
    const { email, name, role, password } = body;
    const languageIds: number[] = role === "super_admin"
      ? [...new Set<number>((Array.isArray(body.languageIds) ? body.languageIds : []).map(Number).filter(Number.isInteger))]
      : [Number(body.languageId)].filter(Number.isInteger);

    if (!email || !role || !password) return NextResponse.json({ error: "Email, role, and password are required" }, { status: 400 });
    if (role === "super_admin" && !master) return NextResponse.json({ error: "Only the Master Super Admin can create Super Admins" }, { status: 403 });
    if (role !== "super_admin" && !ADMIN_ROLES.includes(role)) return NextResponse.json({ error: "Invalid role" }, { status: 400 });
    if (password.length < 8) return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 400 });
    if (!languageIds.length) return NextResponse.json({ error: "Choose at least one language" }, { status: 400 });

    const allowedIds = new Set((session.user.languageRoles ?? []).map((r) => r.languageId));
    if (!master && languageIds.some((id) => !allowedIds.has(id))) return NextResponse.json({ error: "You can only assign administrators to your own languages" }, { status: 403 });
    const languages = await prisma.language.findMany({ where: { id: { in: languageIds }, isActive: true }, select: { id: true } });
    if (languages.length !== languageIds.length) return NextResponse.json({ error: "One or more selected languages are unavailable" }, { status: 400 });

    const normalizedEmail = String(email).trim().toLowerCase();
    if (await prisma.user.findFirst({ where: { email: { equals: normalizedEmail, mode: "insensitive" } }, select: { id: true } })) return NextResponse.json({ error: "Email already in use" }, { status: 409 });

    const user = await prisma.user.create({ data: {
      email: normalizedEmail, name: name?.trim() || null, passwordHash: await bcrypt.hash(password, 12),
      status: "active", emailVerified: new Date(), isSuperAdmin: role === "super_admin",
      isMasterSuperAdmin: false,
      languageRoles: { create: languageIds.map((languageId) => ({ languageId, role: role === "super_admin" ? "language_admin" : role, assignedBy: session.user.id })) },
    } });
    await logAction({ userId: session.user.id, action: "admin.created", entityType: "user", entityId: user.id, newValue: { email: normalizedEmail, role, languageIds } });
    return NextResponse.json({ success: true, data: { id: user.id, email: user.email } });
  } catch (err: any) {
    console.error("[admins POST]", err);
    return NextResponse.json({ success: false, error: err.message || "Failed to create admin" }, { status: 500 });
  }
}
