import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { logAction } from "@/lib/audit";

export async function GET() {
  const languages = await prisma.language.findMany({
    where: { isActive: true },
    orderBy: { displayOrder: "asc" },
    select: { id: true, code: true, name: true, nativeName: true },
  });
  return NextResponse.json({ success: true, data: languages });
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (!(session.user as any).isSuperAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const { code, name, nativeName, flagIcon, displayOrder, adminEmail } = body;

    if (!code || !name || !nativeName) {
      return NextResponse.json(
        { error: "code, name, nativeName required" },
        { status: 400 }
      );
    }

    const existing = await prisma.language.findUnique({ where: { code } });
    if (existing) {
      return NextResponse.json(
        { error: "Language code already exists" },
        { status: 400 }
      );
    }

    const result = await prisma.$transaction(
      async (tx) => {
        const language = await tx.language.create({
          data: {
            code,
            name,
            nativeName,
            flagIcon: flagIcon || null,
            displayOrder: displayOrder ?? 99,
            isActive: false,
            isDefault: false,
            createdBy: (session.user as any).id,
          },
        });

        const modules = await tx.module.findMany();
        for (const m of modules) {
          await tx.moduleTranslation.create({
            data: {
              moduleId: m.id,
              languageId: language.id,
              title: m.baseName,
            },
          });
        }

        const fieldDefs = await tx.fieldDefinition.findMany();
        for (const f of fieldDefs) {
          await tx.fieldTranslation.create({
            data: {
              fieldId: f.id,
              languageId: language.id,
              label: f.baseLabel,
            },
          });
        }

        await tx.languageSetting.createMany({
          data: [
            {
              languageId: language.id,
              settingKey: "site_title",
              settingValue: name,
            },
            {
              languageId: language.id,
              settingKey: "default_module",
              settingValue: "dictionary",
            },
          ],
        });

        if (adminEmail) {
          const adminUser = await tx.user.findUnique({
            where: { email: adminEmail },
          });
          if (adminUser) {
            await tx.userLanguageRole.create({
              data: {
                userId: adminUser.id,
                languageId: language.id,
                role: "language_admin",
                assignedBy: (session.user as any).id,
              },
            });
          }
        }

        return language;
      },
      {
        timeout: 30000,
        maxWait: 10000,
      }
    );

    await logAction({
      userId: (session.user as any).id,
      action: "language.created",
      entityType: "language",
      entityId: String(result.id),
      newValue: { code, name, nativeName },
    });

    return NextResponse.json({
      success: true,
      data: {
        id: result.id,
        code: result.code,
        name: result.name,
        nativeName: result.nativeName,
      },
    });
  } catch (err: any) {
    console.error("[languages POST]", err);
    return NextResponse.json(
      { success: false, error: err.message || "Failed to create language" },
      { status: 500 }
    );
  }
}