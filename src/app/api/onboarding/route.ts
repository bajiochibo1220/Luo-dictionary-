import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { calculateAge, parseDateOfBirth } from "@/lib/dates";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const user = session.user as any;
    const body = await req.json();
    const { languageId, role, dateOfBirth } = body;

    if (!languageId || !role || !dateOfBirth) {
      return NextResponse.json(
        { success: false, error: "Language, role, and date of birth required" },
        { status: 400 }
      );
    }

    const dob = parseDateOfBirth(
      dateOfBirth.day,
      dateOfBirth.month,
      dateOfBirth.year
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

    const validRoles = [
      "registered",
      "student",
      "teacher",
      "researcher",
      "contributor",
      "elder",
    ];
    if (!validRoles.includes(role)) {
      return NextResponse.json(
        { success: false, error: "Invalid role" },
        { status: 400 }
      );
    }

    const language = await prisma.language.findUnique({
      where: { id: languageId },
    });
    if (!language) {
      return NextResponse.json(
        { success: false, error: "Invalid language" },
        { status: 400 }
      );
    }

    const existing = await prisma.userLanguageRole.findFirst({
      where: { userId: user.id },
    });
    if (existing) {
      // Already onboarded — but ensure DOB/age are set (in case they were missing)
      await prisma.user.update({
        where: { id: user.id },
        data: { dateOfBirth: dob, age },
      });
      return NextResponse.json({ success: true, message: "Already onboarded" });
    }

    await prisma.$transaction([
      prisma.user.update({
        where: { id: user.id },
        data: { dateOfBirth: dob, age },
      }),
      prisma.userLanguageRole.create({
        data: { userId: user.id, languageId, role },
      }),
    ]);

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("[onboarding]", err);
    return NextResponse.json(
      { success: false, error: err.message || "Failed to complete onboarding" },
      { status: 500 }
    );
  }
}