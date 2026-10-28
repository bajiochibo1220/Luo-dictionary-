import { InterfaceText } from "@/components/shared/interface-language";
import { mayReviewRecord, canReadMedia } from "@/lib/governance";
import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { ValidationActions } from "@/components/admin/validation-actions";
import { canValidateCulture, canPublishBeforeReview } from "@/lib/permissions";
import { EarlyPublishButton } from "@/components/admin/early-publish-button";
import { missingEnglishTranslation } from "@/lib/english-translation";

export default async function ValidationDetailPage({
  params: promisedParams,
}: {
  params: Promise<{ id: string }>;
}) {
  const params = await promisedParams;
  const session = await auth();
  if (!session?.user) notFound();
  const englishLanguage = await prisma.language.findUnique({ where: { code: "eng" }, select: { id: true } });
  const record = await prisma.culturalRecord.findUnique({
    where: { id: params.id },
    include: {
      language: true,
      translations: englishLanguage ? { where: { languageId: englishLanguage.id } } : false,
      module: true,
      publication: { select: { id: true, status: true } },
      media: true,
      contributor: { select: { name: true, email: true } },
      provenance: { orderBy: { createdAt: "desc" }, take: 1 },
      reviews: { orderBy: { createdAt: "asc" }, include: { reviewer: { select: { name: true } } } },
    },
  });
  if (!record || !mayReviewRecord(session.user, record)) notFound();
  record.media = record.media.filter((asset) => canReadMedia(session.user, asset, record));
  const user = session.user as any;
  const canSee = user.isSuperAdmin || user.isMasterSuperAdmin || (user.languageRoles ?? []).some((role: any) =>
    role.languageId === record.languageId && ["content_editor", "language_admin"].includes(role.role)
  );
  const waitingForCulture = record.status === "submitted" || record.status === "needs_edit" || record.status === "rejection_review" || (record.status === "under_review" && !record.validatorId);
  if (!canSee || !waitingForCulture) notFound();
  const canAct = canValidateCulture(session, record.languageId);
  const proposal = [...record.reviews].reverse().find((review) => review.stage.startsWith("cultural_rejection_vote:") && review.action === "rejection_proposed");
  let rejectionProposal = null;
  if (record.status === "rejection_review" && proposal) {
    const reviewerIds = await prisma.userLanguageRole.findMany({
      where: { languageId: record.languageId, role: "content_editor", userId: { notIn: [proposal.reviewerId, ...(record.contributorId ? [record.contributorId] : [])] }, user: { status: "active" } },
      select: { userId: true },
      distinct: ["userId"],
    });
    const eligibleIds = reviewerIds.map(({ userId }) => userId);
    const votes = record.reviews.filter((review) => review.stage === proposal.stage && eligibleIds.includes(review.reviewerId) && ["rejection_vote_invalid", "rejection_vote_valid"].includes(review.action));
    rejectionProposal = {
      proposerName: proposal.reviewer.name ?? "Cultural reviewer",
      reason: proposal.comments ?? "",
      invalidVotes: new Set(votes.filter((vote) => vote.action === "rejection_vote_invalid").map((vote) => vote.reviewerId)).size,
      validVotes: new Set(votes.filter((vote) => vote.action === "rejection_vote_valid").map((vote) => vote.reviewerId)).size,
      threshold: Math.max(1, Math.ceil(eligibleIds.length / 3)),
      hasVoted: user.id === proposal.reviewerId || votes.some((vote) => vote.reviewerId === user.id),
      canVote: user.id !== proposal.reviewerId && eligibleIds.includes(user.id),
    };
  }

  const d = record.data as any;
  const englishVersion = record.translations[0] ?? null;
  const englishData = englishVersion?.data && typeof englishVersion.data === "object" ? englishVersion.data as Record<string, unknown> : {};
  const missingEnglishFields = record.language.code === "eng" ? [] : missingEnglishTranslation(record.title, record.data, englishVersion);
  const fieldDefs = await prisma.fieldDefinition.findMany({
    where: { moduleId: record.moduleId },
    orderBy: { displayOrder: "asc" },
    include: {
      translations: { where: { languageId: record.languageId } },
    },
  });

  return (
    <div className="max-w-4xl mx-auto">
      <Link
        href="/admin/validation-queue"
        className="inline-flex items-center text-sm text-stone-500 hover:text-amber-600 mb-6"
      ><InterfaceText source="← Back to queue" /></Link>

      <header className="workspace-heading mb-8">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-xs uppercase tracking-wider bg-purple-100 text-purple-700 px-2 py-0.5 rounded-sm">
            {record.module.baseName}
          </span>
          <span className="text-xs text-stone-400">
            {record.language.nativeName}
          </span>
        </div>
        <h1 className="text-3xl font-serif text-stone-800">{record.title}</h1>
      </header>

      <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 p-4">
        {record.publication?.status === "published" ? <p className="text-sm"><InterfaceText source="The uploaded version is public. Continue reviewing and editing here; publishing the reviewed version will replace it automatically." /></p> : <>
          <p className="mb-2 text-sm"><InterfaceText source="You can publish the uploaded version while review continues. Publishing the reviewed version later will replace it at the same public link." /></p>
          {!record.publication && record.status !== "rejection_review" && record.contributorId !== user.id && canPublishBeforeReview(session, record.languageId) && <EarlyPublishButton recordId={record.id} />}
        </>}
      </div>

      {record.status === "needs_edit" && canAct ? <Link href={`/admin/content/${record.id}/edit`} className="mb-4 inline-flex min-h-11 items-center rounded-lg bg-stone-800 px-4 text-white"><InterfaceText source="Edit both versions" /></Link> : <ValidationActions editOnly recordId={record.id} canAct={canAct} canStartEdit={record.status === "submitted" || record.status === "under_review" && !record.validatorId} />}
      <section className="mb-6 grid gap-4 rounded-xl border border-amber-200 bg-amber-50 p-5 sm:grid-cols-2">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-amber-900"><InterfaceText source="Contributor" /></p>
          <p className="mt-1 text-sm text-stone-800">{record.contributor?.name || "Name not provided"}</p>
          {record.contributor?.email && <p className="text-xs text-stone-600">{record.contributor.email}</p>}
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-amber-900"><InterfaceText source="Permission and credit" /></p>
          <p className="mt-1 text-sm text-stone-800"><InterfaceText source="Permission: " />{String(d?.sourcePermission || "needs review").replaceAll("_", " ")}</p>
          <p className="text-xs text-stone-600"><InterfaceText source="Credit: " />{String(d?.attributionPreference || "decide with source").replaceAll("_", " ")}</p>
        </div>
        {record.sourceReference && <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-amber-900"><InterfaceText source="Source reference" /></p>
          <p className="mt-1 text-sm text-stone-800">{record.sourceReference}</p>
        </div>}
        {record.provenance[0]?.sourceLocation && <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-amber-900"><InterfaceText source="Collection location" /></p>
          <p className="mt-1 text-sm text-stone-800">{record.provenance[0].sourceLocation}</p>
        </div>}
      </section>

      {record.language.code !== "eng" && <section className="mb-6 rounded-xl border border-blue-200 bg-blue-50 p-6">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-blue-900"><InterfaceText source="English version · compare with " />{record.language.nativeName}</h2>
        {englishVersion?.title ? <>
          <h3 className="mt-3 font-serif text-xl text-stone-900">{englishVersion.title}</h3>
          <dl className="mt-4 space-y-3">
            {Object.entries(englishData).filter(([, value]) => typeof value === "string" && value.trim()).map(([key, value]) => <div key={key}>
              <dt className="text-xs uppercase tracking-wide text-blue-800">{key.replaceAll("_", " ")}</dt>
              <dd className="whitespace-pre-line text-sm text-stone-800">{String(value)}</dd>
            </div>)}
          </dl>
        </> : <p className="mt-3 text-sm text-red-800"><InterfaceText source="English version is incomplete. Return it for translation before approving." /></p>}
        {missingEnglishFields.length > 0 && <p className="mt-3 text-sm font-medium text-red-800"><InterfaceText source="Missing English fields: " />{missingEnglishFields.join(", ")}</p>}
      </section>}

      <section className="bg-white rounded-xl shadow-xs border border-stone-100 p-8 mb-6">
        <h2 className="text-xs uppercase tracking-wider text-stone-400 mb-4"><InterfaceText source="Content" /></h2>
        <dl className="space-y-4">
          {fieldDefs.map((f) => {
            const value = d?.[f.fieldCode];
            if (!value) return null;
            const label = f.baseLabel;
            return (
              <div key={f.id}>
                <dt className="text-xs uppercase tracking-wider text-stone-400 mb-1">
                  {label}
                </dt>
                <dd className="text-stone-800 whitespace-pre-line leading-relaxed">
                  {String(value)}
                </dd>
              </div>
            );
          })}
        </dl>
      </section>

      {record.media.length > 0 && <section className="mb-6 rounded-xl border border-stone-100 bg-white p-6 shadow-xs">
        <h2 className="mb-4 text-xs uppercase tracking-wider text-stone-500"><InterfaceText source="Attached files (" />{record.media.length}<InterfaceText source=") · check these with the story" /></h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {record.media.map((asset) => <article key={asset.id} className="overflow-hidden rounded-lg border border-stone-200 bg-stone-50">
            {asset.type === "image" && <img src={`/api/media/${asset.id}/file`} alt={asset.caption || "Attached cultural image"} className="max-h-80 w-full object-contain bg-stone-900/5" />}
            {asset.type === "video" && <video src={`/api/media/${asset.id}/file`} controls className="max-h-80 w-full bg-black" />}
            {asset.type === "audio" && <audio src={`/api/media/${asset.id}/file`} controls className="w-full p-4" />}
            <div className="flex items-center justify-between gap-3 border-t border-stone-200 px-3 py-2 text-xs text-stone-600">
              <span className="capitalize">{asset.type} · {asset.format}</span>
              <a href={`/api/media/${asset.id}/file?download=1`} target="_blank" rel="noopener noreferrer" className="text-amber-800 underline"><InterfaceText source="Open file" /></a>
            </div>
          </article>)}
        </div>
      </section>}

      <ValidationActions recordId={record.id} canAct={canAct} rejectionProposal={rejectionProposal} />
    </div>
  );
}
