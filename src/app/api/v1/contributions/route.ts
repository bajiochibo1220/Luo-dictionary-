import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentAccount } from "@/lib/account-data";
import { nativeApiHeaders, nativePreflight } from "@/lib/native-api-headers";
export const dynamic = "force-dynamic";
export const OPTIONS = nativePreflight;
export async function GET(request: Request) {
  const headers = nativeApiHeaders(request);
  try {
    const account = await getCurrentAccount(request);
    if (!account) return NextResponse.json({ success: false, error: "Sign in to contribute." }, { status: 401, headers });
    const params = new URL(request.url).searchParams;
    const languageId = Number(params.get("languageId")); const code = params.get("module");
    if (!Number.isSafeInteger(languageId) || languageId < 1 || code && !/^[a-z][a-z0-9_]{0,59}$/.test(code)) return NextResponse.json({ success: false, error: "Invalid language or module." }, { status: 400, headers });
    const language = await prisma.language.findFirst({ where: { id: languageId, isActive: true }, select: { id: true, code: true, nativeName: true } });
    if (!language) return NextResponse.json({ success: false, error: "Language unavailable." }, { status: 404, headers });
    const [modules, submissions] = await Promise.all([
      prisma.module.findMany({ where: { isActive: true, isStub: false, fieldDefinitions: { some: {} } }, orderBy: { displayOrder: "asc" }, select: { id: true, code: true, baseName: true, translations: { where: { languageId }, select: { title: true } }, fieldDefinitions: { orderBy: { displayOrder: "asc" }, include: { translations: { where: { languageId } } } } } }),
      prisma.culturalRecord.findMany({ where: { contributorId: account.id, languageId }, orderBy: { updatedAt: "desc" }, take: 100, select: { id: true, moduleId: true, title: true, data: true, status: true, consentScope: true, restrictionLevel: true, embargoUntil: true, countyCode: true, siteName: true, sourceReference: true, sessionId: true, media: { select: { id: true, type: true, url: true, format: true, caption: true } } } }),
    ]);
    return NextResponse.json({ success: true, data: { language, modules: modules.map(module => ({ code: module.code, id: module.id, title: module.translations[0]?.title || module.baseName, fields: module.fieldDefinitions.map(field => ({ id: field.id, fieldCode: field.fieldCode, baseLabel: field.baseLabel, label: field.translations[0]?.label || field.baseLabel, fieldType: field.fieldType, isRequired: field.isRequired, displayOrder: field.displayOrder })) })), submissions } }, { headers });
  } catch { return NextResponse.json({ success: false, error: "Contributions are temporarily unavailable." }, { status: 503, headers }); }
}
