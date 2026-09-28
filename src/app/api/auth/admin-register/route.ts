import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { calculateAge, parseDateOfBirth } from "@/lib/dates";
import { z } from "zod";

export const dynamic = "force-dynamic";

const adminRegisterSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  dateOfBirth: z.object({
    day: z.number().int().min(1).max(31),
    month: z.number().int().min(1).max(12),
    year: z.number().int().min(1900).max(new Date().getFullYear()),
  }),
});

export async function GET() {
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
    const data = adminRegisterSchema.parse(body);

    const emailTaken = await prisma.user.findUnique({
      where: { email: data.email },
    });
    if (emailTaken) {
      return NextResponse.json(
        { success: false, error: "Email already registered" },
        { status: 400 }
      );
    }

    // Super admin's primary language is always English
    const englishLang = await prisma.language.findFirst({
      where: { code: "eng" },
      orderBy: { displayOrder: "asc" },
    });
    // Fallback: any active language if English is not found
    const fallbackLang = englishLang
      ? englishLang
      : await prisma.language.findFirst({
          where: { isActive: true },
          orderBy: { displayOrder: "asc" },
        });

    if (!fallbackLang) {
      return NextResponse.json(
        {
          success: false,
          error:
            "No active language found. Please seed the database first.",
        },
        { status: 500 }
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
            languageId: fallbackLang.id,
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