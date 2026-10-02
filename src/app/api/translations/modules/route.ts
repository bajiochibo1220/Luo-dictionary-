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
  const { moduleId, languageId, title, description } = body;

  if (!moduleId || !languageId || !title) {
    return NextResponse.json(
      { error: "moduleId, languageId, and title required" },
      { status: 400 }
    );
  }
  if (typeof title !== "string" || typeof moduleId !== "number" || typeof languageId !== "number") {
    return NextResponse.json({ error: "moduleId, languageId, and title have invalid types" }, { status: 400 });
  }
  if (!canReviewContent(session, languageId)) {
    return NextResponse.json({ error: "You cannot edit translations for this language" }, { status: 403 });
  }

  const module = await prisma.module.findUnique({ where: { id: moduleId }, select: { id: true } });
  const language = await prisma.language.findUnique({ where: { id: languageId }, select: { id: true, code: true } });
  if (!module || !language) return NextResponse.json({ error: "Invalid module or language" }, { status: 400 });

  const updated = await prisma.moduleTranslation.upsert({
    where: {
      moduleId_languageId: { moduleId, languageId },
    },
    update: { title, description },
    create: { moduleId, languageId, title, description },
  });

  // Revalidate public pages
  revalidatePath(`/${language.code}`, "layout");
  await logAction({
    userId: (session.user as any).id,
    action: "translation.module.updated",
    entityType: "module_translation",
    entityId: String(updated.id),
    newValue: { moduleId, languageId, title, description: description ?? null },
  });

  return NextResponse.json({ success: true, data: updated });
}
