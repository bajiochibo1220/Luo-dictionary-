import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { logAction } from "@/lib/audit";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!(session.user as any).isSuperAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const admins = await prisma.user.findMany({
    where: {
      OR: [
        { isSuperAdmin: true },
        {
          languageRoles: {
            some: {
              role: {
                in: [
                  "language_admin",
                  "moderator",
                  "content_editor",
                  "cultural_expert",
                ],
              },
            },
          },
        },
      ],
    },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      email: true,
      name: true,
      isSuperAdmin: true,
      status: true,
      createdAt: true,
      languageRoles: {
        select: {
          id: true,
          role: true,
          language: { select: { code: true, nativeName: true } },
        },
      },
    },
  });

  return NextResponse.json({ success: true, data: admins });
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (!(session.user as any).isSuperAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const { email, name, role, languageId, password } = body;

    if (!email || !role) {
      return NextResponse.json(
        { error: "email and role are required" },
        { status: 400 }
      );
    }

    const validRoles = [
      "super_admin",
      "language_admin",
      "moderator",
      "content_editor",
      "cultural_expert",
    ];
    if (!validRoles.includes(role)) {
      return NextResponse.json({ error: "Invalid role" }, { status: 400 });
    }

    if (!password || password.length < 8) {
      return NextResponse.json(
        { error: "Password must be at least 8 characters" },
        { status: 400 }
      );
    }

    const emailTaken = await prisma.user.findUnique({ where: { email } });
    if (emailTaken) {
      return NextResponse.json(
        { error: "Email already in use" },
        { status: 400 }
      );
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const user = await prisma.user.create({
      data: {
        email,
        name: name || null,
        passwordHash,
        status: "active",
        emailVerified: new Date(),
        isSuperAdmin: role === "super_admin",
        languageRoles:
          role !== "super_admin" && languageId
            ? {
                create: {
                  languageId,
                  role,
                  assignedBy: (session.user as any).id,
                },
              }
            : undefined,
      },
    });

    await logAction({
      userId: (session.user as any).id,
      action: "admin.created",
      entityType: "user",
      entityId: user.id,
      newValue: { email, role, languageId },
    });

    return NextResponse.json({
      success: true,
      data: { id: user.id, email: user.email },
    });
  } catch (err: any) {
    console.error("[admins POST]", err);
    return NextResponse.json(
      { success: false, error: err.message || "Failed to create admin" },
      { status: 500 }
    );
  }
}