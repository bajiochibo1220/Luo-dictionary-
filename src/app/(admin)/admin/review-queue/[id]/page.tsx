import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { ReviewActions } from "@/components/admin/review-actions";

export default async function ReviewDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const record = await prisma.culturalRecord.findUnique({
    where: { id: params.id },
    include: {
      language: true,
      module: true,
      media: true,
      reviews: {
        include: { reviewer: { select: { name: true, email: true } } },
        orderBy: { createdAt: "desc" },
      },
    },
  });
  if (!record) notFound();

  const d = record.data as any;
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
        href="/admin/review-queue"
        className="inline-flex items-center text-sm text-stone-500 hover:text-amber-600 mb-6"
      >
        ← Back to queue
      </Link>

      <header className="mb-8">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-xs uppercase tracking-wider bg-amber-100 text-amber-700 px-2 py-0.5 rounded">
            {record.module.baseName}
          </span>
          <span className="text-xs text-stone-400">
            {record.language.nativeName}
          </span>
        </div>
        <h1 className="text-3xl font-serif text-stone-800">{record.title}</h1>
        <p className="text-sm text-stone-500 mt-1">
          Submitted {new Date(record.createdAt).toLocaleString("en-KE")}
        </p>
      </header>

      {/* Content fields */}
      <section className="bg-white rounded-xl shadow-sm border border-stone-100 p-8 mb-6">
        <h2 className="text-xs uppercase tracking-wider text-stone-400 mb-4">
          Content
        </h2>
        <dl className="space-y-4">
          {fieldDefs.map((f) => {
            const value = d?.[f.fieldCode];
            if (!value) return null;
            const label = f.translations[0]?.label || f.baseLabel;
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

        {record.media.length > 0 && (
          <div className="mt-6 pt-6 border-t border-stone-100">
            <h3 className="text-xs uppercase tracking-wider text-stone-400 mb-3">
              Media ({record.media.length})
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {record.media.map((m) => (
                <div
                  key={m.id}
                  className="bg-stone-50 rounded-lg p-3 text-xs text-stone-500 border border-stone-200"
                >
                  <p className="font-medium text-stone-700 mb-1">
                    {m.type} · {m.format}
                  </p>
                  <a
                    href={m.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-amber-600 hover:underline"
                  >
                    Open →
                  </a>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* Review history */}
      {record.reviews.length > 0 && (
        <section className="bg-white rounded-xl shadow-sm border border-stone-100 p-6 mb-6">
          <h2 className="text-xs uppercase tracking-wider text-stone-400 mb-4">
            Review History
          </h2>
          <ul className="space-y-3">
            {record.reviews.map((rv) => (
              <li
                key={rv.id}
                className="text-sm border-l-2 border-stone-200 pl-3"
              >
                <p className="text-stone-700">
                  <span className="font-medium">
                    {rv.reviewer.name || rv.reviewer.email}
                  </span>{" "}
                  <span className="text-stone-500">{rv.action}</span>
                </p>
                {rv.comments && (
                  <p className="text-stone-500 italic mt-1">
                    &ldquo;{rv.comments}&rdquo;
                  </p>
                )}
                <p className="text-xs text-stone-400 mt-1">
                  {new Date(rv.createdAt).toLocaleString("en-KE")}
                </p>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Action buttons */}
      <ReviewActions recordId={record.id} />
    </div>
  );
}