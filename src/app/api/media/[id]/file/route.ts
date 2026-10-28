import { withApiErrors } from "@/lib/content-workflow";
import { assertServiceAvailable } from "@/lib/maintenance";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { cloudinary, configureCloudinary } from "@/lib/cloudinary";
import { canReadMedia, isPubliclyEligible } from "@/lib/governance";
import { logAction } from "@/lib/audit";
import { nativeApiHeaders } from "@/lib/native-api-headers";
import { trackEvent } from "@/lib/analytics";

export const dynamic = "force-dynamic";

async function handleGET(
  request: NextRequest,
  { params: promisedParams }: { params: Promise<{ id: string }> }
) {
  const params = await promisedParams;
  const [, asset, session] = await Promise.all([assertServiceAvailable(), prisma.mediaAsset.findUnique({
    where: { id: params.id },
    include: {
      record: { select: { status: true, consentScope: true, restrictionLevel: true, embargoUntil: true, languageId: true, contributorId: true } },
      dictionary: { select: { status: true, consentScope: true, restrictionLevel: true, embargoUntil: true, languageId: true, contributorId: true } },
    },
  }), auth()]);
  if (!asset) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const user = session?.user as any;
  const assetPublic = isPubliclyEligible(asset);
  const parent = asset.record ?? asset.dictionary;
  const parentPublic = !parent || (parent.status === "published" && isPubliclyEligible(parent));
  const accessUser = user ? {
    id: user.id,
    isSuperAdmin: !!(user.isSuperAdmin || user.isMasterSuperAdmin),
    languageRoles: user.languageRoles ?? [],
  } : null;
  if (!canReadMedia(accessUser, asset, parent)) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (!(assetPublic && parentPublic)) {
    await logAction({
      userId: user?.id ?? null,
      action: "media.restricted_accessed",
      entityType: "media_asset",
      entityId: asset.id,
      newValue: { recordId: asset.recordId, dictionaryId: asset.dictionaryId },
      ipAddress: request.headers.get("x-forwarded-for"),
      userAgent: request.headers.get("user-agent"),
    });
  }

  const download = request.nextUrl.searchParams.get("download") === "1";
  const requestedWidth = request.nextUrl.searchParams.get("width");
  const width = requestedWidth ? Number(requestedWidth) : null;
  const poster = request.nextUrl.searchParams.get("poster") === "1";
  if (poster && asset.type !== "video") return NextResponse.json({ error: "Only videos have posters." }, { status: 400 });
  if (requestedWidth && ((asset.type !== "image" && !poster) || ![320,640,960,1280].includes(width!))) return NextResponse.json({ error: "Choose a supported image size." }, { status: 400 });
  const optimized = !download && (asset.type === "image" || asset.type === "video");
  if (asset.deliveryType !== "authenticated" && !download && !optimized) {
    return new NextResponse(null, { status: 302, headers: { Location: asset.url, "Cache-Control": "private, no-store" } });
  }

  await configureCloudinary();

  const expiresAt = Math.floor(Date.now() / 1000) + 120;
  const originalUrl = () => asset.deliveryType !== "authenticated" ? asset.url : cloudinary.utils.private_download_url(asset.publicId, asset.format, {
    resource_type: asset.resourceType,
    type: "authenticated",
    expires_at: expiresAt,
  });
  // Stable, signed CDN transformations reuse Cloudinary's derived files. Keep
  // delivery behind this permission check, including every conditional request.
  const signedUrl = optimized ? cloudinary.url(asset.publicId, {
    resource_type: asset.resourceType,
    type: asset.deliveryType === "authenticated" ? "authenticated" : "upload",
    sign_url: true, secure: true,
    format: poster ? "jpg" : asset.type === "video" ? "mp4" : asset.format,
    transformation: [
      { width: width ?? (poster ? 640 : 1280), crop: "limit" },
      { quality: "auto" },
      ...(asset.type === "image" ? [{ fetch_format: "auto" }] : poster ? [{ start_offset: "0" }] : [{ video_codec: "h264" }]),
    ],
  }) : originalUrl();
  if (asset.deliveryType !== "authenticated" && !/^https:\/\/res\.cloudinary\.com\//i.test(signedUrl)) return NextResponse.json({ error: "Media storage address unavailable." }, { status: 502 });
  const range = request.headers.get("range");
  const revalidate = optimized && !range && request.headers.get("if-none-match");
  const upstreamHeaders = { ...(range ? { range } : {}), ...(optimized && request.headers.get("Accept") ? { Accept: request.headers.get("Accept")! } : {}), ...(revalidate ? { "If-None-Match": revalidate } : {}) };
  let upstream = await fetch(signedUrl, {
    headers: upstreamHeaders,
    cache: "no-store",
    signal: request.signal,
  });
  if (optimized && upstream.status === 304) {
    return new NextResponse(null, { status: 304, headers: { ...nativeApiHeaders(request), "Cache-Control": "private, no-cache", Vary: "Accept", ETag: upstream.headers.get("etag") || revalidate || "" } });
  }
  // A new video derivative may still be processing, or a legacy asset may not
  // support conversion. Continue streaming the original rather than break play.
  if (optimized && !poster && !upstream.ok && upstream.status !== 416) {
    await upstream.body?.cancel();
    upstream = await fetch(originalUrl(), { headers: { ...(range ? { range } : {}) }, cache: "no-store", signal: request.signal });
  }
  if (upstream.status === 416) {
    await upstream.body?.cancel();
    return new NextResponse(null, { status: 416, headers: { ...nativeApiHeaders(request), "Cache-Control": "private, no-store", "Content-Range": upstream.headers.get("content-range") || "bytes */*" } });
  }
  if (!upstream.ok || !upstream.body) {
    return NextResponse.json({ error: "Media is temporarily unavailable" }, { status: 502 });
  }
  if (download) {
    const country = process.env.VERCEL === "1" ? request.headers.get("x-vercel-ip-country") : null;
    await trackEvent({ eventType: "download", userId: user?.id ?? null, languageId: asset.languageId, entityType: "media_asset", entityId: asset.id, metadata: country && /^[A-Z]{2}$/.test(country) ? {country} : {} });
    await logAction({ userId: user?.id ?? null, action: "media.downloaded", entityType: "media_asset", entityId: asset.id });
  }

  const contentType = upstream.headers.get("content-type") || "application/octet-stream";
  const safeInline = /^(?:image\/(?:jpeg|png|gif|webp|avif|bmp)|audio\/[a-z0-9.+-]+|video\/[a-z0-9.+-]+)(?:;|$)/i.test(contentType);
  const filename = `${asset.assetId || asset.id}.${asset.format}`.replace(/[^a-zA-Z0-9_.-]/g, "_");
  const headers = new Headers({
    ...nativeApiHeaders(request),
    "Content-Type": safeInline ? contentType : "application/octet-stream",
    "Cache-Control": optimized && safeInline ? "private, no-cache" : "private, no-store",
    "Vary": "Accept",
    "X-Content-Type-Options": "nosniff",
    "Content-Disposition": safeInline && !download ? "inline" : `attachment; filename="${filename}"`,
  });
  for (const name of ["accept-ranges", "content-length", "content-range", "etag"]) {
    const value = upstream.headers.get(name);
    if (value) headers.set(name, value);
  }
  return new NextResponse(upstream.body, { status: upstream.status, headers });
}

export const GET = withApiErrors(handleGET);
