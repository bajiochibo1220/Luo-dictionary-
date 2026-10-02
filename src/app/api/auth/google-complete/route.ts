import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createHash } from "crypto";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { calculateAge, parseDateOfBirth } from "@/lib/dates";
import { getSystemSetting } from "@/lib/settings";
import { DEFAULT_PRIVACY, DEFAULT_TERMS } from "@/lib/legal-content";

const completionSchema = z.object({
  name: z.string().trim().min(2).max(100),
  languageId: z.number().int().positive(),
  interests: z.array(z.enum(["community_member", "student", "contributor", "researcher", "teacher"])).max(5).default([]),
  dateOfBirth: z.object({
    day: z.number().int().min(1).max(31),
    month: z.number().int().min(1).max(12),
    year: z.number().int().min(1900).max(new Date().getFullYear()),
  }),
  acceptedTerms: z.literal(true),
});

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ success: false, error: "Please sign in with Google again." }, { status: 401 });

  const account = await prisma.account.findFirst({
    where: { userId: session.user.id, provider: "google" },
    select: { id: true },
  });
  if (!account) return NextResponse.json({ success: false, error: "Finish sign-up with the Google button." }, { status: 403 });

  const parsed = completionSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ success: false, error: parsed.error.issues[0]?.message ?? "Check the details and try again." }, { status: 400 });

  const dob = parseDateOfBirth(parsed.data.dateOfBirth.day, parsed.data.dateOfBirth.month, parsed.data.dateOfBirth.year);
  if (!dob) return NextResponse.json({ success: false, error: "Enter a real date of birth." }, { status: 400 });
  const age = calculateAge(dob);
  if (age < 5 || age > 120) return NextResponse.json({ success: false, error: "Age must be between 5 and 120." }, { status: 400 });

  const language = await prisma.language.findFirst({ where: { id: parsed.data.languageId, isActive: true }, select: { id: true } });
  if (!language) return NextResponse.json({ success: false, error: "Choose an active language." }, { status: 400 });

  const user = await prisma.user.findUnique({ where: { id: session.user.id }, select: { status: true } });
  if (!user || user.status === "suspended") return NextResponse.json({ success: false, error: "This account is not available." }, { status: 403 });

  const [terms, privacy] = await Promise.all([
    getSystemSetting("terms_content", DEFAULT_TERMS),
    getSystemSetting("privacy_content", DEFAULT_PRIVACY),
  ]);
  const legalVersion = createHash("sha256").update(`${terms}\n---\n${privacy}`).digest("hex");

  await prisma.$transaction(async (tx) => {
    await tx.user.update({ where: { id: session.user.id }, data: { name: parsed.data.name, dateOfBirth: dob, age, profileTypes: parsed.data.interests } });
    await tx.consentRecord.create({
      data: {
        languageId: language.id,
        contributorName: parsed.data.name,
        contributorType: "registered",
        consentType: "platform_terms_privacy",
        consentGiven: true,
        consentDate: new Date(),
        notes: `Accepted Terms and Privacy Policy version sha256:${legalVersion}`,
      },
    });
  });

  return NextResponse.json({ success: true });
}
