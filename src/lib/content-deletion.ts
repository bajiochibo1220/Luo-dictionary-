import { prisma } from "@/lib/db";
import { canDeleteContent, canEditContent } from "@/lib/permissions";
import { canReadRecord } from "@/lib/governance";

// Archive and remove in one transaction: a failed archive must prevent deletion.
export async function deleteUnpublishedContent(session: Parameters<typeof canEditContent>[0], ids: string[], options: { deletePublicVersions?: boolean } = {}) {
  if (!session?.user?.id) throw Object.assign(new Error("Sign in first."), { status: 401 });
  const userId = session.user.id;
  const user = session.user;
  ids = [...new Set(ids)];
  if (!ids.length || ids.length > 100 || ids.some(id => typeof id !== "string" || !id.trim())) throw Object.assign(new Error("Select between 1 and 100 records."), { status: 400 });
  return prisma.$transaction(async tx => {
    for (const id of [...ids].sort()) {
      await tx.$queryRaw`SELECT id FROM cultural_records WHERE id = ${id} FOR UPDATE`;
      const archiveRelations = { translations: true, reviews: true, versions: true, media: true, transcripts: true, provenance: true, consentRecords: true } as const;
      const record = await tx.culturalRecord.findUnique({ where: { id }, include: { publication: { include: archiveRelations }, ...archiveRelations } });
      if (!record || !canReadRecord(user, record)) throw Object.assign(new Error("Content not found."), { status: 404 });
      const hasPublicVersion = ["published", "published_source"].includes(record.status) || !!record.publication;
      if (record.publicationOfId) throw Object.assign(new Error("Delete the original upload to remove it and its public version together."), { status: 409 });
      if (hasPublicVersion && !options.deletePublicVersions) throw Object.assign(new Error("Content with a public version cannot be deleted without confirming removal from public view."), { status: 409 });
      if (!canDeleteContent(session, record)) throw Object.assign(new Error("You do not have permission to delete this item. Only the Master Super Admin or assigned language administrator may remove public versions."), { status: 403 });
      const snapshot = JSON.parse(JSON.stringify(record, (_key, value) => typeof value === "bigint" ? value.toString() : value));
      await tx.auditLog.create({ data: { userId, action: "content.deleted", entityType: "cultural_record", entityId: id, oldValue: snapshot, newValue: { status: "deleted", contributorId: record.contributorId, languageId: record.languageId, title: record.title } } });
      if (record.publication) await tx.culturalRecord.delete({ where: { id: record.publication.id } });
      await tx.culturalRecord.delete({ where: { id } });
    }
    return ids.length;
  }, { timeout: 60_000 });
}
