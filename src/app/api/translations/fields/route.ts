import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { canReviewContent } from "@/lib/permissions";
import { logAction } from "@/lib/audit";

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
  if (typeof label !== "string" || typeof fieldId !== "number" || typeof languageId !== "number") {
    return NextResponse.json({ error: "fieldId, languageId, and label have invalid types" }, { status: 400 });
  }
  if (!canReviewContent(session, languageId)) {
    return NextResponse.json({ error: "You cannot edit translations for this language" }, { status: 403 });
  }

  const field = await prisma.fieldDefinition.findUnique({ where: { id: fieldId }, select: { id: true } });
  const language = await prisma.language.findUnique({ where: { id: languageId }, select: { id: true, code: true } });
  if (!field || !language) return NextResponse.json({ error: "Invalid field or language" }, { status: 400 });

  const updated = await prisma.fieldTranslation.upsert({
    where: {
      fieldId_languageId: { fieldId, languageId },
    },
    update: { label, placeholder, helpText },
    create: { fieldId, languageId, label, placeholder, helpText },
  });

  revalidatePath(`/${language.code}`, "layout");
  await logAction({
    userId: (session.user as any).id,
    action: "translation.field.updated",
    entityType: "field_translation",
    entityId: String(updated.id),
    newValue: { fieldId, languageId, label, placeholder: placeholder ?? null, helpText: helpText ?? null },
  });

  return NextResponse.json({ success: true, data: updated });
}
