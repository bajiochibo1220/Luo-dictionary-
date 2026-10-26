import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { canEditContent } from "@/lib/permissions";
import { interfaceSettingKey, normalizeInterfaceText } from "@/lib/interface-copy";
import { getInterfaceCatalog } from "@/lib/interface-catalog";
import { invalidateSettingsCache, getSystemSetting } from "@/lib/settings";
import { withApiErrors } from "@/lib/content-workflow";
import { nativeApiHeaders, nativePreflight } from "@/lib/native-api-headers";

export const OPTIONS = nativePreflight;
export const GET = withApiErrors(async (request: Request) => {
  const code = new URL(request.url).searchParams.get("community") || "luo";
  const language = code !== "eng" && await prisma.language.findUnique({ where: { code }, select: { id: true, code: true, isActive: true } });
  if (!language || !language.isActive) return NextResponse.json({ error: "Choose an active community language." }, { status: 400, headers: nativeApiHeaders(request) });
  const catalog = await getInterfaceCatalog(code, language.id, await getSystemSetting(interfaceSettingKey(code)));
  return NextResponse.json({ success: true, data: { community: code, catalog } }, { headers: nativeApiHeaders(request) });
});

export const PATCH = withApiErrors(async (request: Request) => {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  const body = await request.json();
  if (!body || typeof body.community !== "string" || body.community === "eng" || !Array.isArray(body.entries) || !body.entries.length || body.entries.length > 100) return NextResponse.json({ error: "Choose a community and between 1 and 100 text entries." }, { status: 400 });
  const language = await prisma.language.findUnique({ where: { code: body.community }, select: { id: true, isActive: true } });
  if (!language?.isActive || !canEditContent(session, language.id)) return NextResponse.json({ error: "Only an assigned editor or language administrator can edit this community's interface." }, { status: 403 });
  const defaults = await getInterfaceCatalog(body.community, language.id);
  for (const entry of body.entries) {
    if (!entry || typeof entry.source !== "string" || !normalizeInterfaceText(entry.source) || entry.source.length > 4000 || typeof entry.local !== "string" || typeof entry.english !== "string" || entry.local.length > 8000 || !entry.english.trim() || entry.english.length > 8000) return NextResponse.json({ error: "Each entry needs a source, community-language text and an English version." }, { status: 400 });
    if (!Object.hasOwn(defaults, normalizeInterfaceText(entry.source))) return NextResponse.json({ error: "Choose a registered interface text entry." }, { status: 400 });
  }
  await prisma.$transaction(async tx => {
    const key = interfaceSettingKey(body.community);
    await tx.$queryRaw`WITH lock_result AS MATERIALIZED (SELECT pg_advisory_xact_lock(hashtext(${key}))) SELECT 1::int AS locked FROM lock_result`;
    const saved = await tx.systemSetting.findUnique({ where: { key } });
    const overrides = saved?.value ? JSON.parse(saved.value) : {};
    const catalog = { ...defaults, ...overrides };
    const before: Record<string, unknown> = {}, after: Record<string, unknown> = {};
    for (const entry of body.entries) {
      const source = normalizeInterfaceText(entry.source);
      before[source] = catalog[source] ?? null;
      catalog[source] = { local: entry.local.trim(), english: entry.english.trim() };
      overrides[source] = catalog[source];
      after[source] = catalog[source];
    }
    const value = JSON.stringify(overrides);
    await tx.systemSetting.upsert({ where: { key }, create: { key, value }, update: { value } });
    await tx.auditLog.create({ data: { userId: session.user!.id, action: "interface_copy.updated", entityType: "interface_copy", entityId: body.community, oldValue: before as any, newValue: after as any } });
  });
  invalidateSettingsCache();
  return NextResponse.json({ success: true });
});
