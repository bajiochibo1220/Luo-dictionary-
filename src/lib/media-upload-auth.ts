import { prisma } from "@/lib/db";
import { canContribute, canReviewContent, canUploadContent, isSuperAdmin } from "@/lib/permissions";
import { generateFolderPath } from "@/lib/cloudinary";
import { canReadRecord } from "@/lib/governance";
import { EDITABLE_STATUSES } from "@/lib/content-workflow";

export async function authorizeMediaUpload(
  session: any,
  input: { languageCode: string; moduleCode: string; recordId: string; assetType: string }
) {
  const language = await prisma.language.findUnique({ where: { code: input.languageCode } });
  if (!language) throw Object.assign(new Error("Invalid language"), { status: 400 });
  if (!isSuperAdmin(session) && !canContribute(session, language.id)) {
    throw Object.assign(new Error("You cannot contribute to this language"), { status: 403 });
  }
  const contentModule = await prisma.module.findUnique({ where: { code: input.moduleCode } });
  if (!contentModule) throw Object.assign(new Error("Invalid content area"), { status: 400 });
  if (!["image", "video", "audio", "document"].includes(input.assetType)) {
    throw Object.assign(new Error("Invalid media type"), { status: 400 });
  }

  const record = await prisma.culturalRecord.findUnique({
    where: { id: input.recordId },
    select: {
      id: true, languageId: true, moduleId: true, contributorId: true,
      status: true,
      consentScope: true, restrictionLevel: true, embargoUntil: true,
      countyCode: true, siteName: true, sourceReference: true, sessionId: true,
      createdAt: true,
      language: { select: { code: true } },
    },
  });
  const sourceLocale = record?.languageId === language.id;
  const hasTranslation = record && !sourceLocale
    ? await prisma.culturalRecordTranslation.findUnique({ where: { recordId_languageId: { recordId: record.id, languageId: language.id } }, select: { id: true } })
    : null;
  const permitted = record && (
    sourceLocale
      ? record.contributorId === session.user.id || canUploadContent(session, language.id)
      : !!hasTranslation && canUploadContent(session, language.id)
  );
  if (!record || record.moduleId !== contentModule.id || !permitted) {
    throw Object.assign(new Error("Invalid content record or insufficient permission"), { status: 403 });
  }
  if (!EDITABLE_STATUSES.includes(record.status)) throw Object.assign(new Error("Files can be attached only to a draft or returned item. Ask a reviewer to return this item for changes."), { status: 409 });
  if (!canReadRecord(session.user, record)) throw Object.assign(new Error("You cannot access this content record."), { status: 403 });

  return {
    language,
    module: contentModule,
    record,
    folder: generateFolderPath(record.language.code, contentModule.code, record.id, input.assetType),
  };
}
