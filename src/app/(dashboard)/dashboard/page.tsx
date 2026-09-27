import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

const GREETINGS: Record<string, string> = {
  luo: "Misawa",
  eng: "Welcome",
  kik: "Wĩ mwega",
};

export default async function UserDashboardPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const user = session.user as any;
  const languageRoles = (user.languageRoles ?? []) as any[];

  // Pick primary language
  const primaryRole = languageRoles[0];
  const primaryLanguageId = primaryRole?.languageId;
  const primaryLanguageCode = primaryRole?.languageCode ?? "eng";
  const primaryLanguageName = primaryRole?.languageName ?? "English";

  const greeting = GREETINGS[primaryLanguageCode] ?? "Welcome";

  // Stats
  const [myUploads, approved, pending] = await Promise.all([
    prisma.culturalRecord.count({
      where: { contributorId: user.id },
    }),
    prisma.culturalRecord.count({
      where: { contributorId: user.id, status: "published" },
    }),
    prisma.culturalRecord.count({
      where: {
        contributorId: user.id,
        status: { in: ["submitted", "under_review", "validated"] },
      },
    }),
  ]);

  // Modules available in the user's language with translations
  const modules = primaryLanguageId
    ? await prisma.module.findMany({
        where: { isActive: true, isStub: false },
        orderBy: { displayOrder: "asc" },
        include: {
          translations: {
            where: { languageId: primaryLanguageId },
          },
        },
      })
    : [];

  // Recent submissions
  const recent = await prisma.culturalRecord.findMany({
    where: { contributorId: user.id },
    orderBy: { createdAt: "desc" },
    take: 5,
    include: {
      module: { select: { baseName: true } },
    },
  });

  return (
    <div>
      {/* Welcome */}
      <header className="mb-8">
        <h1 className="text-3xl font-serif text-stone-800 mb-1">
          {greeting}, {user.name || user.email?.split("@")[0]}!
        </h1>
        <p className="text-sm text-stone-500">
          Contributing to {primaryLanguageName}
        </p>
      </header>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="bg-white rounded-xl shadow-sm border border-stone-100 p-5">
          <p className="text-xs uppercase tracking-wider text-stone-400 mb-1">
            My Uploads
          </p>
          <p className="text-3xl font-serif text-stone-800">{myUploads}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-stone-100 p-5">
          <p className="text-xs uppercase tracking-wider text-stone-400 mb-1">
            Approved
          </p>
          <p className="text-3xl font-serif text-green-600">{approved}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-stone-100 p-5">
          <p className="text-xs uppercase tracking-wider text-stone-400 mb-1">
            Pending
          </p>
          <p className="text-3xl font-serif text-amber-600">{pending}</p>
        </div>
      </div>

      {/* Contribute */}
      <section className="mb-8">
        <h2 className="text-lg font-serif text-stone-800 mb-4">
          Contribute
        </h2>
        {!primaryLanguageId ? (
          <div className="bg-white rounded-xl shadow-sm border border-stone-100 p-8 text-center text-stone-500">
            <p>You are not assigned to a language yet.</p>
            <p className="text-sm mt-2">
              Contact an administrator to be added as a contributor.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {modules.map((m) => {
              const title =
                m.translations[0]?.title ?? m.baseName;
              return (
                <Link
                  key={m.id}
                  href={`/contribute/${m.code}`}
                  className="group block p-5 bg-white rounded-xl shadow-sm hover:shadow-lg transition border border-stone-100 hover:border-amber-300"
                >
                  <h3 className="text-base font-serif text-stone-800 group-hover:text-amber-700 mb-1">
                    {title}
                  </h3>
                  <p className="text-xs text-stone-400">{m.baseName}</p>
                  <p className="text-xs text-amber-600 mt-3">+ Add</p>
                </Link>
              );
            })}
          </div>
        )}
      </section>

      {/* Recent submissions */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-serif text-stone-800">
            Recent Submissions
          </h2>
          <Link
            href="/my-submissions"
            className="text-xs uppercase tracking-wider text-amber-600 hover:text-amber-700"
          >
            View all →
          </Link>
        </div>

        {recent.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm border border-stone-100 p-8 text-center text-stone-400">
            <p className="text-sm">
              You have not submitted anything yet
            </p>
            <p className="text-xs mt-2 text-stone-400">
              Pick a module above to start contributing
            </p>
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-sm border border-stone-100 overflow-hidden">
            <ul className="divide-y divide-stone-100">
              {recent.map((r) => {
                const statusColors: Record<string, string> = {
                  draft: "bg-stone-100 text-stone-600",
                  submitted: "bg-amber-100 text-amber-700",
                  under_review: "bg-blue-100 text-blue-700",
                  validated: "bg-purple-100 text-purple-700",
                  published: "bg-green-100 text-green-700",
                  rejected: "bg-red-100 text-red-700",
                  revision: "bg-amber-100 text-amber-700",
                };
                return (
                  <li key={r.id} className="p-4 flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-stone-800 truncate">
                        {r.title}
                      </p>
                      <p className="text-xs text-stone-400">
                        {r.module.baseName} ·{" "}
                        {new Date(r.createdAt).toLocaleDateString("en-KE")}
                      </p>
                    </div>
                    <span
                      className={`text-xs px-2 py-1 rounded-full whitespace-nowrap ${
                        statusColors[r.status] ?? statusColors.draft
                      }`}
                    >
                      {r.status.replace("_", " ")}
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </section>
    </div>
  );
}