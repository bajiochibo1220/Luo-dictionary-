import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { registerSchema } from "@/lib/validation";
import { calculateAge, parseDateOfBirth } from "@/lib/dates";

export const dynamic = "force-dynamic";

export async function GET() {
  // Report whether setup is still open
  const existing = await prisma.user.findFirst({
    where: { isSuperAdmin: true },
    select: { id: true },
  });
  return NextResponse.json({
    success: true,
    data: { setupOpen: !existing },
  });
}

export async function POST(req: NextRequest) {
  try {
    // Guard: refuse if a super admin already exists
    const existing = await prisma.user.findFirst({
      where: { isSuperAdmin: true },
      select: { id: true, email: true },
    });
    if (existing) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Super admin already exists. Setup is locked. Ask them to create your account.",
        },
        { status: 403 }
      );
    }

    const body = await req.json();
    const data = registerSchema.parse(body);

    const emailTaken = await prisma.user.findUnique({
      where: { email: data.email },
    });
    if (emailTaken) {
      return NextResponse.json(
        { success: false, error: "Email already registered" },
        { status: 400 }
      );
    }

    const language = await prisma.language.findUnique({
      where: { id: data.languageId },
    });
    if (!language) {
      return NextResponse.json(
        { success: false, error: "Invalid language" },
        { status: 400 }
      );
    }

    const dob = parseDateOfBirth(
      data.dateOfBirth.day,
      data.dateOfBirth.month,
      data.dateOfBirth.year
    );
    if (!dob) {
      return NextResponse.json(
        { success: false, error: "Invalid date of birth" },
        { status: 400 }
      );
    }

    const age = calculateAge(dob);
    if (age < 18) {
      return NextResponse.json(
        { success: false, error: "Super admin must be 18 or older" },
        { status: 400 }
      );
    }

    const passwordHash = await bcrypt.hash(data.password, 12);

    const user = await prisma.user.create({
      data: {
        name: data.name,
        email: data.email,
        passwordHash,
        dateOfBirth: dob,
        age,
        isSuperAdmin: true,
        status: "active",
        emailVerified: new Date(),
        languageRoles: {
          create: {
            languageId: data.languageId,
            role: "language_admin",
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      data: { id: user.id, email: user.email },
    });
  } catch (err: any) {
    if (err.name === "ZodError") {
      return NextResponse.json(
        { success: false, error: err.errors[0].message },
        { status: 400 }
      );
    }
    console.error("[admin-register]", err);
    return NextResponse.json(
      { success: false, error: "Setup failed" },
      { status: 500 }
    );
  }
}