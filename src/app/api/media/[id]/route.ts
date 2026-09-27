import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { deleteFromCloudinary } from "@/lib/cloudinary";

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const asset = await prisma.mediaAsset.findUnique({
    where: { id: params.id },
    include: {
      language: true,
      record: { select: { id: true, title: true, moduleId: true } },
    },
  });
  if (!asset) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json({ success: true, data: asset });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = session.user as any;
  if (!user.isSuperAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const asset = await prisma.mediaAsset.findUnique({
    where: { id: params.id },
  });
  if (!asset) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Delete from Cloudinary first
  try {
    await deleteFromCloudinary(
      asset.publicId,
      (asset.resourceType as "image" | "video" | "raw") || "image"
    );
  } catch (err) {
    console.error("[cloudinary delete]", err);
    // Continue even if Cloudinary fails — remove DB row anyway
  }

  await prisma.mediaAsset.delete({ where: { id: params.id } });
  return NextResponse.json({ success: true });
}