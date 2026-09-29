import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { uploadToCloudinary, generateFolderPath } from "@/lib/cloudinary";
import { canContribute, canReviewContent, isSuperAdmin } from "@/lib/permissions";

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const languageCode = formData.get("languageCode") as string;
    const moduleCode = formData.get("moduleCode") as string;
    const recordId = (formData.get("recordId") as string) || "unassigned";
    const assetType = (formData.get("assetType") as string) || "media";

    if (!file) {
      return NextResponse.json(
        { success: false, error: "No file provided" },
        { status: 400 }
      );
    }

    if (!languageCode || !moduleCode) {
      return NextResponse.json(
        { success: false, error: "languageCode and moduleCode are required" },
        { status: 400 }
      );
    }

    const language = await prisma.language.findUnique({
      where: { code: languageCode },
    });

    if (!language) {
      return NextResponse.json(
        { success: false, error: "Invalid language" },
        { status: 400 }
      );
    }

    if (!isSuperAdmin(session) && !canContribute(session, language.id)) {
      return NextResponse.json({ success: false, error: "You cannot contribute to this language" }, { status: 403 });
    }

    const module = await prisma.module.findUnique({ where: { code: moduleCode } });
    if (!module) {
      return NextResponse.json({ success: false, error: "Invalid content area" }, { status: 400 });
    }

    let linkedRecord: { id: string; languageId: number; moduleId: number; contributorId: string | null; language: { code: string } } | null = null;
    if (recordId !== "unassigned") {
      linkedRecord = await prisma.culturalRecord.findUnique({
        where: { id: recordId },
        select: { id: true, languageId: true, moduleId: true, contributorId: true, language: { select: { code: true } } },
      });
      const isSourceLanguage = linkedRecord?.languageId === language.id;
      const hasTranslation = linkedRecord && !isSourceLanguage
        ? await prisma.culturalRecordTranslation.findUnique({ where: { recordId_languageId: { recordId: linkedRecord.id, languageId: language.id } }, select: { id: true } })
        : null;
      const mayUpload = linkedRecord && (
        isSourceLanguage
          ? linkedRecord.contributorId === (session.user as any).id || canReviewContent(session, language.id)
          : !!hasTranslation && canReviewContent(session, language.id)
      );
      if (!linkedRecord || linkedRecord.moduleId !== module.id || !mayUpload) {
        return NextResponse.json({ success: false, error: "Invalid content record" }, { status: 403 });
      }
    }

    const storageLanguageCode = linkedRecord?.language.code ?? languageCode;
    const folder = generateFolderPath(
      storageLanguageCode,
      moduleCode,
      recordId,
      assetType
    );

    const buffer = Buffer.from(await file.arrayBuffer());

    const uploaded = await uploadToCloudinary(buffer, folder, {
      resourceType: "auto",
      tags: [languageCode, moduleCode, assetType],
    });

    const asset = await prisma.mediaAsset.create({
      data: {
        // A translation editor attaches media to the same source record. Keep
        // the asset in its record's source locale so every translation shares it.
        languageId: linkedRecord?.languageId ?? language.id,
        recordId: linkedRecord?.id ?? null,
        type: assetType,
        url: uploaded.url,
        publicId: uploaded.publicId,
        resourceType: uploaded.resourceType,
        checksum: uploaded.checksum,
        format: uploaded.format,
        sizeBytes: uploaded.sizeBytes,
        durationSecs: uploaded.durationSecs,
        width: uploaded.width,
        height: uploaded.height,
        thumbnailUrl: uploaded.thumbnailUrl,
        nrfMetadata: {
          domain: "culture",
          genre: moduleCode,
          consent: "granted",
          restriction: "none",
        },
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        ...asset,
        sizeBytes: Number(asset.sizeBytes),
      },
    });
  } catch (err: any) {
    console.error("[media/upload]", err);
    return NextResponse.json(
      { success: false, error: err.message ?? "Upload failed" },
      { status: 500 }
    );
  }
}
