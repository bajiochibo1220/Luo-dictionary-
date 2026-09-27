import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { AiTabs } from "@/components/admin/ai-tabs";
import { AiFlagButton } from "@/components/admin/ai-flag-button";
import { StatCard } from "@/components/admin/stat-card";

export default async function AiMonitoringPage({
  searchParams,
}: {
  searchParams: { tab?: string; lang?: string };
}) {
  const session = await auth();
  const user = session!.user as any;
  const isSuperAdmin = !!user.isSuperAdmin;

  const tab = searchParams.tab || "chatbot";

  const languages = await prisma.language.findMany({
    where: { isActive: true },
    orderBy: { displayOrder: "asc" },
  });

  const langCode = searchParams.lang;
  const language = langCode ? languages.find((l) => l.code === langCode) : null;

  const where: any = {};
  if (language) where.languageId = language.id;
  else if (!isSuperAdmin) {
    const managed = ((user.languageRoles ?? []) as any[]).map(
      (r) => r.languageId
    );
    where.languageId = { in: managed };
  }

  // Chatbot stats
  const [totalQueries, avgLatency, ratedCount, upCount, flaggedCount] =
    await Promise.all([
      prisma.aIResponse.count({ where }),
      prisma.aIResponse.aggregate({ where, _avg: { latencyMs: true } }),
      prisma.aIResponse.count({ where: { ...where, rating: { not: null } } }),
      prisma.aIResponse.count({ where: { ...where, rating: "up" } }),
      prisma.aIResponse.count({ where: { ...where, flagged: true } }),
    ]);

  const satisfactionPct =
    ratedCount === 0 ? 0 : Math.round((upCount / ratedCount) * 100);

  const recentQueries = await prisma.aIResponse.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: 20,
  });

  // Embedding coverage
  const totalRecords = await prisma.culturalRecord.count({
    where: { ...(language ? { languageId: language.id } : {}), status: "published" },
  });
  const totalEmbeddings = await prisma.embedding.count({
    where: language ? { record: { languageId: language.id } } : {},
  });
  const coveragePct =
    totalRecords === 0 ? 0 : Math.round((totalEmbeddings / totalRecords) * 100);

  const flagged = await prisma.aIResponse.findMany({
    where: { ...where, flagged: true },
    orderBy: { createdAt: "desc" },
    take: 20,
  });

  return (
    <div>
      <header className="mb-6">
        <h1 className="text-3xl font-serif text-stone-800 mb-1">
          AI Monitoring
        </h1>
        <p className="text-sm text-stone-500">
          Chatbot usage, embedding coverage, and flagged responses
        </p>
      </header>

      {/* Language filter */}
      <div className="mb-6 flex flex-wrap gap-2">
        <a
          href={`/admin/ai-monitoring?tab=${tab}`}
          className={`text-xs px-3 py-1.5 rounded-full ${
            !langCode
              ? "bg-amber-600 text-white"
              : "bg-white border border-stone-200 text-stone-600 hover:border-amber-400"
          }`}
        >
          All languages
        </a>
        {languages.map((l) => (
          <a
            key={l.code}
            href={`/admin/ai-monitoring?tab=${tab}&lang=${l.code}`}
            className={`text-xs px-3 py-1.5 rounded-full ${
              langCode === l.code
                ? "bg-amber-600 text-white"
                : "bg-white border border-stone-200 text-stone-600 hover:border-amber-400"
            }`}
          >
            {l.nativeName}
          </a>
        ))}
      </div>

      <AiTabs active={tab} />

      {tab === "chatbot" && (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <StatCard label="Total Queries" value={totalQueries} />
            <StatCard
              label="Avg Response"
              value={
                avgLatency._avg.latencyMs
                  ? `${(avgLatency._avg.latencyMs / 1000).toFixed(1)}s`
                  : "—"
              }
            />
            <StatCard
              label="Satisfaction"
              value={satisfactionPct > 0 ? `${satisfactionPct}%` : "—"}
            />
            <StatCard
              label="Flagged"
              value={flaggedCount}
              accent="stone"
            />
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-stone-100 overflow-hidden">
            <div className="px-6 py-4 border-b border-stone-100">
              <h2 className="text-xs uppercase tracking-wider text-stone-400">
                Recent Queries
              </h2>
            </div>
            {recentQueries.length === 0 ? (
              <div className="p-12 text-center text-stone-400 text-sm">
                No chatbot queries yet — AI feature coming in Prompt 37
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-stone-50">
                  <tr>
                    <th className="text-left px-4 py-2 text-xs uppercase tracking-wider text-stone-500 font-medium">
                      Query
                    </th>
                    <th className="text-left px-4 py-2 text-xs uppercase tracking-wider text-stone-500 font-medium">
                      Response
                    </th>
                    <th className="text-right px-4 py-2 text-xs uppercase tracking-wider text-stone-500 font-medium">
                      Rating
                    </th>
                    <th className="text-right px-4 py-2 text-xs uppercase tracking-wider text-stone-500 font-medium">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {recentQueries.map((q) => (
                    <tr key={q.id} className="border-t border-stone-100">
                      <td className="px-4 py-3 text-stone-700 max-w-xs">
                        <p className="line-clamp-2">{q.query}</p>
                      </td>
                      <td className="px-4 py-3 text-stone-600 max-w-md">
                        <p className="line-clamp-2 text-xs">{q.response}</p>
                      </td>
                      <td className="px-4 py-3 text-right text-xs">
                        {q.rating === "up"
                          ? "👍"
                          : q.rating === "down"
                          ? "👎"
                          : "—"}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <AiFlagButton id={q.id} flagged={q.flagged} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}

      {tab === "embeddings" && (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <StatCard label="Published Records" value={totalRecords} />
            <StatCard label="Embeddings" value={totalEmbeddings} />
            <StatCard
              label="Coverage"
              value={`${coveragePct}%`}
              accent="green"
            />
            <StatCard label="Pending" value={totalRecords - totalEmbeddings} />
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-stone-100 p-6">
            <h2 className="text-xs uppercase tracking-wider text-stone-400 mb-4">
              Embedding Coverage
            </h2>
            <div className="h-3 bg-stone-100 rounded-full overflow-hidden mb-3">
              <div
                className="h-full bg-gradient-to-r from-amber-400 to-amber-600 rounded-full transition-all"
                style={{ width: `${coveragePct}%` }}
              />
            </div>
            <p className="text-sm text-stone-500">
              {totalEmbeddings} of {totalRecords} published records have been
              embedded for AI search
            </p>
            <p className="text-xs text-stone-400 mt-4">
              Batch embedding will be available in Prompt 36 (Embeddings
              Pipeline)
            </p>
          </div>
        </>
      )}

      {tab === "flagged" && (
        <div className="bg-white rounded-xl shadow-sm border border-stone-100 overflow-hidden">
          <div className="px-6 py-4 border-b border-stone-100">
            <h2 className="text-xs uppercase tracking-wider text-stone-400">
              Flagged Responses ({flagged.length})
            </h2>
          </div>
          {flagged.length === 0 ? (
            <div className="p-12 text-center text-stone-400 text-sm">
              No responses flagged for review
            </div>
          ) : (
            <ul className="divide-y divide-stone-100">
              {flagged.map((f) => (
                <li key={f.id} className="p-6">
                  <p className="text-xs uppercase tracking-wider text-stone-400 mb-1">
                    Query
                  </p>
                  <p className="text-stone-700 mb-3">{f.query}</p>
                  <p className="text-xs uppercase tracking-wider text-stone-400 mb-1">
                    Response
                  </p>
                  <p className="text-sm text-stone-600 mb-3 whitespace-pre-line">
                    {f.response}
                  </p>
                  <div className="flex justify-between items-center pt-3 border-t border-stone-100">
                    <span className="text-xs text-stone-400">
                      {new Date(f.createdAt).toLocaleString("en-KE")}
                    </span>
                    <AiFlagButton id={f.id} flagged={true} />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}