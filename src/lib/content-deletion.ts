import { prisma } from "@/lib/db";
import { canEditContent, canUploadContent, isLanguageAdmin } from "@/lib/permissions";
import { canReadRecord } from "@/lib/governance";

// Archive and remove in one transaction: a failed archive must prevent deletion.
export async function deleteUnpublishedContent(session: Parameters<typeof canEditContent>[0], ids: string[]) {
  if (!session?.user?.id) throw Object.assign(new Error("Sign in first."), { status: 401 });
  const userId = session.user.id;
  const user = session.user;
  return prisma.$transaction(async tx => {
    for (const id of [...ids].sort()) {
      await tx.$queryRaw`SELECT id FROM cultural_records WHERE id = ${id} FOR UPDATE`;
      const record = await tx.culturalRecord.findUnique({ where: { id }, include: { translations: true, reviews: true, versions: true, media: true, transcripts: true, provenance: true, consentRecords: true } });
      if (!record || !canReadRecord(user, record)) throw Object.assign(new Error("Content not found."), { status: 404 });
      if (record.status === "published") throw Object.assign(new Error("Published content cannot be deleted."), { status: 409 });
      if (!canEditContent(session, record.languageId) && !isLanguageAdmin(session, record.languageId) && !(record.contributorId === userId && canUploadContent(session, record.languageId))) throw Object.assign(new Error("Only the assigned editor, language administrator or original uploader can delete this item."), { status: 403 });
      const snapshot = JSON.parse(JSON.stringify(record, (_key, value) => typeof value === "bigint" ? value.toString() : value));
      await tx.auditLog.create({ data: { userId, action: "content.deleted", entityType: "cultural_record", entityId: id, oldValue: snapshot, newValue: { status: "deleted", contributorId: record.contributorId, languageId: record.languageId, title: record.title } } });
      await tx.culturalRecord.delete({ where: { id } });
    }
    return ids.length;
  });
}
