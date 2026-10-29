import { InterfaceText } from "@/components/shared/interface-language";
import { canReadRecord } from "@/lib/governance";
import { canDeleteContent } from "@/lib/permissions";
import { ReviewQueueList } from "@/components/admin/review-queue-list";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";

export default async function ValidationQueuePage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const user = session.user;
  const oversight = !!(user.isSuperAdmin || user.isMasterSuperAdmin);
  const languageIds = (user.languageRoles ?? []).filter(role => ["content_editor", "language_admin"].includes(role.role)).map(role => role.languageId);
  if (!oversight && !languageIds.length) redirect("/admin/dashboard");
  const candidates = await prisma.culturalRecord.findMany({
    where: {
      publicationOfId: null,
      OR: [{ status: "submitted" }, { status: "needs_edit" }, { status: "under_review", validatorId: null }, { status: "rejection_review" }],
      ...(oversight ? {} : { languageId: { in: languageIds } }),
    },
    orderBy: [{ moduleId: "asc" }, { createdAt: "asc" }],
    include: { language: { select: { nativeName: true } }, module: { select: { baseName: true } }, publication: { select: { id: true } } },
  });
  const records = candidates.filter(record => canReadRecord(user, record));
  return <div className="mx-auto max-w-6xl">
    <header className="workspace-heading mb-4"><h1 className="font-serif text-3xl"><InterfaceText source="Review & edit" /></h1><p className="mt-2 text-sm text-stone-700"><InterfaceText source="Review new uploads and continue unfinished edits here. Check the community-language and English versions, then send for publishing." /></p></header>
    <ReviewQueueList items={records.map(record => ({ id: record.id, title: record.title, status: record.status, language: record.language.nativeName, module: record.module.baseName, hasPublicVersion: !!record.publication, canDelete: canDeleteContent(session, record) }))} />
  </div>;
}
