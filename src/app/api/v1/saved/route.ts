import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getCurrentAccount } from "@/lib/account-data";
import { publicRecordWhere } from "@/lib/governance";
import { publicLearningWhere } from "@/lib/learning-service";
import { nativeApiHeaders, nativePreflight, sameOriginBrowserPost } from "@/lib/native-api-headers";
export const dynamic = "force-dynamic";
export const OPTIONS = nativePreflight;
export async function GET(request: Request) {
  const headers = nativeApiHeaders(request);
  try {
    const account = await getCurrentAccount(request);
    if (!account) return NextResponse.json({ success: false, error: "Sign in to view saved items." }, { status: 401, headers });
    const saved = await prisma.savedItem.findMany({ where: { userId: account.id }, orderBy: { createdAt: "desc" }, take: 200 });
    const ids = (kind: string) => saved.filter(item => item.kind === kind).map(item => item.resourceId);
    const [cultural, dictionary, learning] = await Promise.all([
      prisma.culturalRecord.findMany({ where: { id: { in: ids("cultural") }, ...publicRecordWhere() }, select: { id: true, title: true, summary: true, module: { select: { code: true } } } }),
      prisma.dictionaryEntry.findMany({ where: { id: { in: ids("dictionary") }, ...publicRecordWhere() }, select: { id: true, dholuo: true, english: true } }),
      prisma.learningResource.findMany({ where: { id: { in: ids("learning") }, ...publicLearningWhere }, select: { id: true, title: true, description: true } }),
    ]);
    const visible = [...cultural.map(item => ({ id: item.id, kind: "cultural", title: item.title, summary: item.summary, href: `/dashboard?module=${item.module.code}` })), ...dictionary.map(item => ({ id: item.id, kind: "dictionary", title: item.dholuo, summary: item.english, href: "/dashboard?module=dictionary" })), ...learning.map(item => ({ id: item.id, kind: "learning", title: item.title, summary: item.description, href: "/learn" }))];
    return NextResponse.json({ success: true, data: { items: saved.flatMap(item => { const source = visible.find(source => source.id === item.resourceId && source.kind === item.kind); return source ? [source] : []; }) } }, { headers });
  } catch { return NextResponse.json({ success: false, error: "Saved items unavailable." }, { status: 503, headers }); }
}
export async function POST(request: Request) {
  const headers = nativeApiHeaders(request);
  try {
    if (!request.headers.has("Authorization") && !sameOriginBrowserPost(request)) return NextResponse.json({ success: false, error: "Same-origin request required." }, { status: 403, headers });
    const account = await getCurrentAccount(request);
    if (!account) return NextResponse.json({ success: false, error: "Sign in to save items." }, { status: 401, headers });
    const data = z.object({ action: z.enum(["save", "remove"]), kind: z.enum(["cultural", "dictionary", "learning"]), resourceId: z.string().uuid() }).parse(await request.json());
    const where = { userId: account.id, resourceId: data.resourceId, kind: data.kind };
    if (data.action === "remove") await prisma.savedItem.deleteMany({ where });
    else {
      const eligible = data.kind === "cultural" ? await prisma.culturalRecord.findFirst({ where: { id: data.resourceId, ...publicRecordWhere() }, select: { id: true } }) : data.kind === "dictionary" ? await prisma.dictionaryEntry.findFirst({ where: { id: data.resourceId, ...publicRecordWhere() }, select: { id: true } }) : await prisma.learningResource.findFirst({ where: { id: data.resourceId, ...publicLearningWhere }, select: { id: true } });
      if (!eligible) return NextResponse.json({ success: false, error: "Item is no longer available." }, { status: 404, headers });
      await prisma.savedItem.upsert({ where: { userId_resourceId_kind: where }, create: where, update: {} });
    }
    return NextResponse.json({ success: true, data: { saved: data.action === "save" } }, { headers });
  } catch (error) { return NextResponse.json({ success: false, error: error instanceof z.ZodError ? "Invalid saved item." : "Item could not be saved." }, { status: error instanceof z.ZodError ? 400 : 503, headers }); }
}
