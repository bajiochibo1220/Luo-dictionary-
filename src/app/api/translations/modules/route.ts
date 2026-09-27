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
  const { moduleId, languageId, title, description } = body;

  if (!moduleId || !languageId || !title) {
    return NextResponse.json(
      { error: "moduleId, languageId, and title required" },
      { status: 400 }
    );
  }

  const updated = await prisma.moduleTranslation.upsert({
    where: {
      moduleId_languageId: { moduleId, languageId },
    },
    update: { title, description },
    create: { moduleId, languageId, title, description },
  });

  // Revalidate public pages
  const lang = await prisma.language.findUnique({
    where: { id: languageId },
  });
  if (lang) {
    revalidatePath(`/${lang.code}`, "layout");
  }

  return NextResponse.json({ success: true, data: updated });
}