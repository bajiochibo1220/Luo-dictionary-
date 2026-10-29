import { CollectionBrowser } from "@/components/shared/collection-browser";
import { InterfaceText } from "@/components/shared/interface-language";
import { canReadRecord } from "@/lib/governance";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export default async function PublishedHistoryPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const user = session.user as any;
  const isSuperAdmin = !!(user.isSuperAdmin || user.isMasterSuperAdmin);
  const languageIds = [...new Set<number>((user.languageRoles ?? []).filter((role: any) => ["publisher", "language_admin"].includes(role.role)).map((role: any) => Number(role.languageId)))];
  if (!isSuperAdmin && !languageIds.length) redirect("/admin/dashboard");
  const candidates = await prisma.culturalRecord.findMany({
    where: { status: "published", ...(isSuperAdmin ? {} : { languageId: { in: languageIds } }) },
    orderBy: { publishedAt: "desc" },
    take: 500,
    include: { language: { select: { nativeName: true } }, module: { select: { baseName: true } }, reviewer: { select: { name: true, email: true } } },
  });
  const records = candidates.filter((record) => canReadRecord(session!.user, record));
  return <main className="mx-auto max-w-6xl"><header className="workspace-heading mb-6"><p className="text-xs uppercase tracking-widest text-amber-900"><InterfaceText source="Publisher records" /></p><h1 className="mt-1 font-serif text-3xl text-stone-900"><InterfaceText source="Published History" /></h1><p className="mt-2 text-sm text-stone-700">{records.length}<InterfaceText source=" published items in your authorized languages." /></p></header>
    <CollectionBrowser emptyMessage="No content has been published in these languages yet." entries={records.map(record => ({
      id: record.id, title: record.title, module: record.module.baseName, language: record.language.nativeName, status: record.isProvisional ? "Published before review" : "published",
      content: <article className="rounded-xl border border-stone-200 bg-white p-4"><h3 className="font-semibold text-stone-900">{record.title}</h3><dl className="mt-3 grid gap-3 text-sm sm:grid-cols-3"><div><dt className="text-xs text-stone-500"><InterfaceText source="Language" /></dt><dd>{record.language.nativeName}</dd></div><div><dt className="text-xs text-stone-500"><InterfaceText source="Published" /></dt><dd>{record.publishedAt?.toLocaleDateString("en-KE", { dateStyle: "medium" }) ?? "Not recorded"}</dd></div><div><dt className="text-xs text-stone-500"><InterfaceText source="Publisher" /></dt><dd>{record.reviewer?.name ?? record.reviewer?.email ?? "Not recorded"}</dd></div></dl></article>,
    }))} />
  </main>;
}
