import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";

export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { fieldId, languageId, label, placeholder, helpText } = body;

  if (!fieldId || !languageId || !label) {
    return NextResponse.json(
      { error: "fieldId, languageId, and label required" },
      { status: 400 }
    );
  }

  const updated = await prisma.fieldTranslation.upsert({
    where: {
      fieldId_languageId: { fieldId, languageId },
    },
    update: { label, placeholder, helpText },
    create: { fieldId, languageId, label, placeholder, helpText },
  });

  const lang = await prisma.language.findUnique({
    where: { id: languageId },
  });
  if (lang) {
    revalidatePath(`/${lang.code}`, "layout");
  }

  return NextResponse.json({ success: true, data: updated });
}