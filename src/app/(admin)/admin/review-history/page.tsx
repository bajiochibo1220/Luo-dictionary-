import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export default async function ReviewHistoryPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const user = session.user as any;
  const isSuperAdmin = !!(user.isSuperAdmin || user.isMasterSuperAdmin);
  const isLanguageAdmin = (user.languageRoles ?? []).some((role: any) => role.role === "language_admin");
  const languageIds = [...new Set<number>((user.languageRoles ?? []).filter((role: any) => ["cultural_expert", "language_admin"].includes(role.role)).map((role: any) => Number(role.languageId)))];
  if (!isSuperAdmin && !languageIds.length) redirect("/admin/dashboard");
  const reviews = await prisma.reviewHistory.findMany({
    where: {
      ...(!isSuperAdmin ? { ...(isLanguageAdmin ? { record: { languageId: { in: languageIds } } } : { reviewerId: user.id }) } : {}),
      OR: [{ stage: "cultural_validation" }, { stage: { startsWith: "cultural_rejection_vote:" } }],
    },
    orderBy: { createdAt: "desc" }, take: 300,
    include: { record: { select: { id: true, title: true, languageId: true, language: { select: { nativeName: true } }, module: { select: { baseName: true } } } } },
  });
  const visibleReviews = isSuperAdmin || isLanguageAdmin ? reviews : reviews.filter((review) => languageIds.includes(review.record.languageId));
  return <main className="mx-auto max-w-6xl"><header className="mb-6"><p className="text-xs uppercase tracking-widest text-amber-900">Cultural expert records</p><h1 className="mt-1 font-serif text-3xl text-stone-900">Review History</h1><p className="mt-2 text-sm text-stone-700">Cultural review actions and decisions for your assigned languages.</p></header>
    <div className="space-y-3">{visibleReviews.map((review) => <article key={review.id} className="rounded-xl border border-stone-200 bg-white p-4"><div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="font-semibold text-stone-900">{review.record.title}</h2><p className="mt-1 text-xs text-stone-500">{review.record.language.nativeName} · {review.record.module.baseName} · {review.action.replaceAll("_", " ")}</p></div><time className="text-xs text-stone-500">{review.createdAt.toLocaleString("en-KE")}</time></div>{review.comments && <p className="mt-3 whitespace-pre-line text-sm text-stone-700">{review.comments}</p>}</article>)}</div>{visibleReviews.length === 0 && <p className="rounded-xl border border-stone-200 bg-white p-8 text-center text-sm text-stone-500">No cultural review history is available.</p>}
  </main>;
}