import { withApiErrors } from "@/lib/content-workflow";
import { assertServiceAvailable } from "@/lib/maintenance";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { cloudinary, configureCloudinary } from "@/lib/cloudinary";
import { canReadMedia, isPubliclyEligible } from "@/lib/governance";
import { logAction } from "@/lib/audit";

export const dynamic = "force-dynamic";

async function handleGET(
  request: NextRequest,
  { params: promisedParams }: { params: Promise<{ id: string }> }
) {
  const params = await promisedParams;
  await assertServiceAvailable();
  const asset = await prisma.mediaAsset.findUnique({
    where: { id: params.id },
    include: {
      record: { select: { status: true, consentScope: true, restrictionLevel: true, embargoUntil: true, languageId: true, contributorId: true } },
      dictionary: { select: { status: true, consentScope: true, restrictionLevel: true, embargoUntil: true, languageId: true, contributorId: true } },
    },
  });
  if (!asset) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const session = await auth();
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
  if (asset.deliveryType !== "authenticated" && !download) {
    return NextResponse.redirect(asset.url, 302);
  }

  await configureCloudinary();

  const expiresAt = Math.floor(Date.now() / 1000) + 120;
  const signedUrl = asset.deliveryType !== "authenticated" ? asset.url : cloudinary.utils.private_download_url(asset.publicId, asset.format, {
    resource_type: asset.resourceType,
    type: "authenticated",
    expires_at: expiresAt,
  });
  if (asset.deliveryType !== "authenticated" && !/^https:\/\/res\.cloudinary\.com\//i.test(signedUrl)) return NextResponse.json({ error: "Media storage address unavailable." }, { status: 502 });
  const range = request.headers.get("range");
  const upstream = await fetch(signedUrl, {
    headers: range ? { range } : undefined,
    cache: "no-store",
  });
  if (!upstream.ok || !upstream.body) {
    return NextResponse.json({ error: "Media is temporarily unavailable" }, { status: 502 });
  }

  const contentType = upstream.headers.get("content-type") || "application/octet-stream";
  const safeInline = /^(?:image\/(?:jpeg|png|gif|webp|avif|bmp)|audio\/[a-z0-9.+-]+|video\/[a-z0-9.+-]+)(?:;|$)/i.test(contentType);
  const filename = `${asset.assetId || asset.id}.${asset.format}`.replace(/[^a-zA-Z0-9_.-]/g, "_");
  const headers = new Headers({
    "Content-Type": safeInline ? contentType : "application/octet-stream",
    "Cache-Control": "private, no-store",
    "X-Content-Type-Options": "nosniff",
    "Content-Disposition": safeInline && !download ? "inline" : `attachment; filename="${filename}"`,
  });
  for (const name of ["accept-ranges", "content-length", "content-range"]) {
    const value = upstream.headers.get(name);
    if (value) headers.set(name, value);
  }
  return new NextResponse(upstream.body, { status: upstream.status, headers });
}

export const GET = withApiErrors(handleGET);
