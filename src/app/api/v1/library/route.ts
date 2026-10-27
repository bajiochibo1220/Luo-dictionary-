import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getPublicLibrary } from "@/lib/public-library";
import { AppLibrarySchema } from "@/lib/app-contract";
import { appApiHeaders } from "@/lib/app-api-headers";
import { assertServiceAvailable } from "@/lib/maintenance";
import { PRD_SUBJECTS } from "@/lib/prd-content-catalog";

export const dynamic = "force-dynamic";

export function OPTIONS(request: NextRequest) {
  return new NextResponse(null, { status: 204, headers: appApiHeaders(request.headers.get("origin")) });
}

export async function GET(request: NextRequest) {
  const headers = appApiHeaders(request.headers.get("origin"));
  const languageCode = request.nextUrl.searchParams.get("language") ?? "luo";
  const moduleCode = request.nextUrl.searchParams.get("module") ?? "";
  const records = request.nextUrl.searchParams.get("records") ?? undefined;
  const dictionary = request.nextUrl.searchParams.get("dictionary") ?? undefined;
  const query = request.nextUrl.searchParams.get("q")?.trim();
  const subject = request.nextUrl.searchParams.get("subject") ?? undefined;
  if ((moduleCode === "subjects" || subject !== undefined) && (moduleCode !== "subjects" || !PRD_SUBJECTS.some(value => value === subject))) return NextResponse.json({ success: false, error: "Choose a valid cultural subject." }, { status: 400, headers });
  if ([records, dictionary].some(value => value && value !== "end" && !/^[A-Za-z0-9_-]{1,128}$/.test(value)) || (query?.length ?? 0) > 200) return NextResponse.json({ success: false, error: "Invalid search or continuation." }, { status: 400, headers });
  if (!/^[a-z]{2,8}(?:-[a-z0-9]+)?$/i.test(languageCode) || !/^[a-z][a-z0-9_]{0,59}$/.test(moduleCode)) {
    return NextResponse.json({ success: false, error: "Invalid language or module." }, { status: 400, headers });
  }
  try {
    await assertServiceAvailable();
    const language = await prisma.language.findFirst({ where: { code: languageCode.toLowerCase(), isActive: true }, select: { id: true, code: true, nativeName: true } });
    if (!language) return NextResponse.json({ success: false, error: "Language not available." }, { status: 404, headers });
    const library = await getPublicLibrary(language, moduleCode, { records, dictionary, query, subject });
    if (!library) return NextResponse.json({ success: false, error: "Module not available." }, { status: 404, headers });
    return NextResponse.json({ success: true, data: AppLibrarySchema.parse(library) }, { headers });
  } catch {
    return NextResponse.json({ success: false, error: "The library is temporarily unavailable." }, { status: 503, headers });
  }
}
