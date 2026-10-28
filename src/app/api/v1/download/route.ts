import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { ContentDownloadError, prepareContentDownload, streamContentDownload } from "@/lib/content-download";
import { assertServiceAvailable } from "@/lib/maintenance";
import { nativeApiHeaders, nativePreflight } from "@/lib/native-api-headers";
import { trackEvent } from "@/lib/analytics";
export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 300;
export const OPTIONS = nativePreflight;
export async function GET(request: NextRequest) {
  const headers = nativeApiHeaders(request);
  try {
    await assertServiceAvailable();
    const input = z.object({ id: z.string().uuid(), kind: z.enum(["cultural", "dictionary"]).default("cultural") }).parse(Object.fromEntries(request.nextUrl.searchParams));
    const bundle = await prepareContentDownload(input.id, input.kind);
    await trackEvent({ eventType: "download", languageId: bundle.languageId, entityType: input.kind === "cultural" ? "cultural_record" : "dictionary_entry", entityId: input.id, metadata: { completeItem: true } });
    const body = await streamContentDownload(bundle, request.signal);
    return new NextResponse(body, { headers: { ...headers, "Content-Type": "application/zip", "Content-Disposition": `attachment; filename="${bundle.filename}"`, "X-Content-Type-Options": "nosniff" } });
  } catch (error) {
    const status = error instanceof z.ZodError ? 400 : error instanceof ContentDownloadError ? error.status : (error as { status?: number })?.status === 503 ? 503 : 502;
    return NextResponse.json({ success: false, error: error instanceof ContentDownloadError ? error.message : status === 400 ? "Choose a valid item to download." : "The complete item could not be downloaded. Please try again." }, { status, headers });
  }
}
