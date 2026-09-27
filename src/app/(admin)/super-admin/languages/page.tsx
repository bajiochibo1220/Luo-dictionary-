import Link from "next/link";
import { prisma } from "@/lib/db";

export default async function LanguagesPage() {
  const languages = await prisma.language.findMany({
    orderBy: { displayOrder: "asc" },
  });

  const stats = await Promise.all(
    languages.map(async (l) => {
      const [recordCount, userCount] = await Promise.all([
        prisma.culturalRecord.count({ where: { languageId: l.id } }),
        prisma.userLanguageRole.count({ where: { languageId: l.id } }),
      ]);
      return { ...l, recordCount, userCount };
    })
  );

  return (
    <div>
      <header className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-serif text-stone-800 mb-1">
            Languages
          </h1>
          <p className="text-sm text-stone-500">
            {languages.length} {languages.length === 1 ? "language" : "languages"} · {stats.filter((l) => l.isActive).length} active
          </p>
        </div>
        <Link
          href="/super-admin/languages/new"
          className="px-5 py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-sm font-medium"
        >
          + Add Language
        </Link>
      </header>

      <div className="bg-white rounded-xl shadow-sm border border-stone-100 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-stone-50 border-b border-stone-200">
            <tr>
              <th className="text-left px-4 py-3 text-xs uppercase tracking-wider text-stone-500 font-medium">
                Language
              </th>
              <th className="text-left px-4 py-3 text-xs uppercase tracking-wider text-stone-500 font-medium">
                Records
              </th>
              <th className="text-left px-4 py-3 text-xs uppercase tracking-wider text-stone-500 font-medium">
                Users
              </th>
              <th className="text-left px-4 py-3 text-xs uppercase tracking-wider text-stone-500 font-medium">
                Status
              </th>
              <th className="text-right px-4 py-3 text-xs uppercase tracking-wider text-stone-500 font-medium">
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {stats.map((l) => (
              <tr
                key={l.id}
                className="border-b border-stone-100 hover:bg-stone-50"
              >
                <td className="px-4 py-3">
                  <Link
                    href={`/super-admin/languages/${l.id}`}
                    className="flex items-center gap-3"
                  >
                    <span className="text-2xl">{l.flagIcon || "🌍"}</span>
                    <div>
                      <p className="font-medium text-stone-800">
                        {l.nativeName}
                      </p>
                      <p className="text-xs text-stone-400">
                        {l.name} · {l.code}
                      </p>
                    </div>
                  </Link>
                </td>
                <td className="px-4 py-3 text-stone-600 tabular-nums">
                  {l.recordCount}
                </td>
                <td className="px-4 py-3 text-stone-600 tabular-nums">
                  {l.userCount}
                </td>
                <td className="px-4 py-3">
                  {l.isActive ? (
                    <span className="text-xs px-2 py-1 rounded-full bg-green-100 text-green-700">
                      Active
                    </span>
                  ) : (
                    <span className="text-xs px-2 py-1 rounded-full bg-stone-100 text-stone-500">
                      Inactive
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 text-right">
                  <Link
                    href={`/super-admin/languages/${l.id}`}
                    className="text-xs text-amber-600 hover:underline"
                  >
                    Manage →
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}