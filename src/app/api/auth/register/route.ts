import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { registerSchema } from "@/lib/validation";
import { calculateAge, parseDateOfBirth } from "@/lib/dates";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const data = registerSchema.parse(body);

    const existing = await prisma.user.findFirst({
      where: { email: { equals: data.email, mode: "insensitive" } },
    });
    if (existing) {
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
    if (age < 5 || age > 120) {
      return NextResponse.json(
        { success: false, error: "Age must be between 5 and 120" },
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
        status: data.role === "registered" ? "active" : "pending",
        languageRoles: {
          create: {
            languageId: data.languageId,
            role: data.role,
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
    console.error("[register]", err);
    return NextResponse.json(
      { success: false, error: "Registration failed" },
      { status: 500 }
    );
  }
}
