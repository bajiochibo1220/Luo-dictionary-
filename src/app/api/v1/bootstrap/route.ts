import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getPublicModules } from "@/lib/public-navigation";
import { APP_NAME, APP_TAGLINE } from "@/lib/brand";
import { APP_ROUTES, CONTENT_FILTERS, CONTENT_VIEWS, contributionHref, moduleHref } from "@/lib/app-navigation";
import { APP_API_VERSION, AppBootstrapSchema } from "@/lib/app-contract";
import { appApiHeaders } from "@/lib/app-api-headers";
import { assertServiceAvailable } from "@/lib/maintenance";

export const dynamic = "force-dynamic";

export function OPTIONS(request: NextRequest) {
  return new NextResponse(null, { status: 204, headers: appApiHeaders(request.headers.get("origin")) });
}

export async function GET(request: NextRequest) {
  const headers = appApiHeaders(request.headers.get("origin"));
  const preferredCode = request.nextUrl.searchParams.get("language");
  if (preferredCode !== null && !/^[a-z]{2,8}(?:-[a-z0-9]+)?$/i.test(preferredCode)) {
    return NextResponse.json({ success: false, error: "Invalid language code." }, { status: 400, headers });
  }
  try {
    await assertServiceAvailable();
    const languages = await prisma.language.findMany({
      where: { isActive: true },
      orderBy: [{ isDefault: "desc" }, { displayOrder: "asc" }],
      select: { id: true, code: true, name: true, nativeName: true },
    });
    const selectedLanguage = preferredCode === null ? languages[0] : languages.find(item => item.code === preferredCode.toLowerCase());
    if (!selectedLanguage) {
      return NextResponse.json({ success: false, error: "Language not available." }, { status: 404, headers });
    }
    const modules = await getPublicModules(selectedLanguage.id);
    const data = AppBootstrapSchema.parse({
      apiVersion: APP_API_VERSION,
      app: {
        name: APP_NAME,
        tagline: APP_TAGLINE,
        version: process.env.NEXT_PUBLIC_APP_VERSION || "development",
        icon: "/icons/luo-heritage-1024.png?v=heritage-2",
        manifest: "/manifest.webmanifest",
      },
      selectedLanguage,
      languages,
      modules: modules.map(item => ({
        code: item.code,
        title: item.translations[0]?.title ?? item.baseName,
        baseName: item.baseName,
        href: moduleHref(item.code),
        contributionHref: item.code !== "audio_visual" && item.code !== "chatbot" && item._count.fieldDefinitions > 0 ? contributionHref(item.code) : null,
      })),
      routes: APP_ROUTES,
      contentFilters: CONTENT_FILTERS,
      contentViews: CONTENT_VIEWS,
    });
    return NextResponse.json({ success: true, data }, { headers });
  } catch {
    // Public clients receive a useful retry state without database details.
    return NextResponse.json({ success: false, error: "App configuration is temporarily unavailable." }, { status: 503, headers });
  }
}
