import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

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
    const { languageId, role } = body;

    if (!languageId || !role) {
      return NextResponse.json(
        { success: false, error: "Language and role are required" },
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

    // Prevent duplicate onboarding
    const existing = await prisma.userLanguageRole.findFirst({
      where: { userId: user.id },
    });
    if (existing) {
      return NextResponse.json({
        success: true,
        message: "Already onboarded",
      });
    }

    await prisma.userLanguageRole.create({
      data: {
        userId: user.id,
        languageId,
        role,
      },
    });

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("[onboarding]", err);
    return NextResponse.json(
      { success: false, error: err.message || "Failed to complete onboarding" },
      { status: 500 }
    );
  }
}