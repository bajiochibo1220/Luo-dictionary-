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
  const records = await prisma.culturalRecord.findMany({
    where: { status: "published", ...(isSuperAdmin ? {} : { languageId: { in: languageIds } }) },
    orderBy: { publishedAt: "desc" },
    take: 500,
    include: { language: { select: { nativeName: true } }, module: { select: { baseName: true } }, reviewer: { select: { name: true, email: true } } },
  });
  return <main className="mx-auto max-w-6xl"><header className="mb-6"><p className="text-xs uppercase tracking-widest text-amber-900">Publisher records</p><h1 className="mt-1 font-serif text-3xl text-stone-900">Published History</h1><p className="mt-2 text-sm text-stone-700">{records.length} published items in your authorized languages.</p></header>
    <section className="overflow-hidden rounded-xl border border-stone-200 bg-white"><div className="overflow-x-auto"><table className="w-full min-w-[650px] text-left text-sm"><thead className="bg-stone-50 text-xs uppercase tracking-wide text-stone-500"><tr><th className="px-4 py-3">Content</th><th className="px-4 py-3">Area</th><th className="px-4 py-3">Language</th><th className="px-4 py-3">Published</th><th className="px-4 py-3">Publisher</th></tr></thead><tbody className="divide-y divide-stone-100">{records.map((record) => <tr key={record.id}><td className="px-4 py-3 font-medium text-stone-900">{record.title}</td><td className="px-4 py-3 text-stone-600">{record.module.baseName}</td><td className="px-4 py-3 text-stone-600">{record.language.nativeName}</td><td className="px-4 py-3 text-stone-600">{record.publishedAt?.toLocaleDateString("en-KE", { dateStyle: "medium" }) ?? "—"}</td><td className="px-4 py-3 text-stone-600">{record.reviewer?.name ?? record.reviewer?.email ?? "—"}</td></tr>)}</tbody></table></div>{records.length === 0 && <p className="p-8 text-center text-sm text-stone-500">No content has been published in these languages yet.</p>}</section>
  </main>;
}
