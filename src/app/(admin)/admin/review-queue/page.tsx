import { InterfaceText } from "@/components/shared/interface-language";
import { canReadRecord } from "@/lib/governance";
import { canDeleteContent } from "@/lib/permissions";
import { ReviewQueueList } from "@/components/admin/review-queue-list";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";

export default async function ReviewQueuePage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const user = session!.user as any;
  const isSuperAdmin = !!(user.isSuperAdmin || user.isMasterSuperAdmin);
  const managedLanguageIds = ((user.languageRoles ?? []) as any[])
    .filter((role) => ["publisher", "language_admin"].includes(role.role))
    .map((role) => role.languageId);
  if (!isSuperAdmin && !managedLanguageIds.length) redirect("/admin/dashboard");

  const where: any = { status: "under_review", validatorId: { not: null } };
  if (!isSuperAdmin) where.languageId = { in: managedLanguageIds };
  const candidates = await prisma.culturalRecord.findMany({
    where,
    orderBy: [{ moduleId: "asc" }, { createdAt: "asc" }],
    include: {
      language: { select: { code: true, nativeName: true } },
      module: { select: { code: true, baseName: true } },
      media: true,
      publication: { select: { id: true } },
    },
  });
  const records = candidates.filter((record) => canReadRecord(session!.user, record));

  return (
    <div>
      <header className="workspace-heading mb-6">
        <h1 className="mb-1 text-3xl font-serif text-stone-800"><InterfaceText source="Review Queue" /></h1>
        <p className="text-sm text-stone-500">{records.length} <InterfaceText source={records.length === 1 ? "item" : "items"} /><InterfaceText source=" awaiting publisher release" /></p>
      </header>
      <ReviewQueueList items={records.map(record => ({
        id: record.id, title: record.title, module: record.module.baseName, language: record.language.nativeName, status: record.status,
        canDelete: canDeleteContent(session, record), hasPublicVersion: !!record.publication,
        href: `/admin/review-queue/${record.id}`, actionLabel: "Open to publish",
      }))} />
    </div>
  );
}
