import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { isSuperAdmin } from "@/lib/permissions";
import { uploadToCloudinary } from "@/lib/cloudinary";
import { setSystemSetting } from "@/lib/settings";
import { logAction } from "@/lib/audit";
import { withApiErrors } from "@/lib/content-workflow";

export const POST = withApiErrors(async (request: NextRequest) => {
  const session = await auth();
  if (!isSuperAdmin(session)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const form = await request.formData();
  const partner = form.get("partner");
  const file = form.get("file");
  if (!["jooust", "nrf"].includes(String(partner)) || !(file instanceof File) || !file.size || file.size > 2 * 1024 * 1024) return NextResponse.json({ error: "Choose a partner and a PNG, JPEG or WebP logo under 2 MB." }, { status: 400 });
  const bytes = Buffer.from(await file.arrayBuffer());
  const png = bytes.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10]));
  const jpeg = bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255;
  const webp = bytes.toString("ascii", 0, 4) === "RIFF" && bytes.toString("ascii", 8, 12) === "WEBP";
  if (!png && !jpeg && !webp) return NextResponse.json({ error: "Use a PNG, JPEG or WebP image." }, { status: 400 });
  const image = await uploadToCloudinary(bytes, "luolinguaai/branding", { resourceType: "image", deliveryType: "upload" });
  await setSystemSetting(`${partner}_logo_url`, image.url);
  await logAction({ userId: session?.user?.id, action: "branding.logo_uploaded", entityType: "system_settings", newValue: { partner, publicId: image.publicId } });
  return NextResponse.json({ success: true, data: { url: image.url } });
});
