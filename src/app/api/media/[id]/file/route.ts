import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { cloudinary } from "@/lib/cloudinary";
import { canAccessGovernedItem, canReviewGovernedItem, isPubliclyEligible } from "@/lib/governance";
import { logAction } from "@/lib/audit";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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
    isSuperAdmin: !!(user.isSuperAdmin || user.isMasterSuperAdmin),
    languageRoles: user.languageRoles ?? [],
  } : null;
  const mayRead = assetPublic && parentPublic
    ? true
    : (canAccessGovernedItem(accessUser, asset, asset.languageId) || canReviewGovernedItem(accessUser, asset, asset.languageId)) &&
      (!parent || parent.contributorId === user?.id || canAccessGovernedItem(accessUser, parent, parent.languageId) || canReviewGovernedItem(accessUser, parent, parent.languageId));  if (!mayRead) return NextResponse.json({ error: "Not found" }, { status: 404 });

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

  if (asset.deliveryType !== "authenticated") {
    return NextResponse.redirect(asset.url, 302);
  }

  const expiresAt = Math.floor(Date.now() / 1000) + 120;
  const signedUrl = cloudinary.utils.private_download_url(asset.publicId, asset.format, {
    resource_type: asset.resourceType,
    type: "authenticated",
    expires_at: expiresAt,
  });
  const range = request.headers.get("range");
  const upstream = await fetch(signedUrl, {
    headers: range ? { range } : undefined,
    cache: "no-store",
  });
  if (!upstream.ok || !upstream.body) {
    return NextResponse.json({ error: "Media is temporarily unavailable" }, { status: 502 });
  }

  const headers = new Headers({
    "Content-Type": upstream.headers.get("content-type") || "application/octet-stream",
    "Cache-Control": assetPublic && parentPublic ? "public, max-age=60" : "private, no-store",
    "X-Content-Type-Options": "nosniff",
    "Content-Disposition": "inline",
  });
  for (const name of ["accept-ranges", "content-length", "content-range"]) {
    const value = upstream.headers.get(name);
    if (value) headers.set(name, value);
  }
  return new NextResponse(upstream.body, { status: upstream.status, headers });
}
