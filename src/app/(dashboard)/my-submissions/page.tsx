import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export default async function MySubmissionsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const user = session.user as any;

  const submissions = await prisma.culturalRecord.findMany({
    where: { contributorId: user.id },
    orderBy: { createdAt: "desc" },
    include: {
      module: { select: { baseName: true } },
      language: { select: { nativeName: true } },
      reviews: {
        orderBy: { createdAt: "desc" },
        take: 1,
      },
    },
  });

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
    <div>
      <header className="mb-6">
        <h1 className="text-3xl font-serif text-stone-800 mb-1">
          My Submissions
        </h1>
        <p className="text-sm text-stone-500">
          {submissions.length}{" "}
          {submissions.length === 1 ? "submission" : "submissions"}
        </p>
      </header>

      {submissions.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-stone-100 p-12 text-center">
          <p className="text-stone-500 mb-4">
            You have not submitted any content yet
          </p>
          <Link
            href="/dashboard"
            className="inline-block px-6 py-2.5 bg-amber-600 text-white rounded-lg text-sm font-medium hover:bg-amber-700"
          >
            Start Contributing
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {submissions.map((s) => (
            <div
              key={s.id}
              className="bg-white rounded-xl shadow-sm border border-stone-100 p-5"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <p className="text-xs uppercase tracking-wider text-stone-400 mb-1">
                    {s.module.baseName} · {s.language.nativeName}
                  </p>
                  <h3 className="text-lg font-serif text-stone-800 mb-1">
                    {s.title}
                  </h3>
                  <p className="text-xs text-stone-400">
                    Submitted{" "}
                    {new Date(s.createdAt).toLocaleString("en-KE", {
                      dateStyle: "medium",
                      timeStyle: "short",
                    })}
                  </p>
                </div>
                <span
                  className={`text-xs px-2 py-1 rounded-full whitespace-nowrap ${
                    statusColors[s.status] ?? statusColors.draft
                  }`}
                >
                  {s.status.replace("_", " ")}
                </span>
              </div>

              {s.reviews.length > 0 && s.reviews[0].comments && (
                <div className="mt-3 pt-3 border-t border-stone-100">
                  <p className="text-xs uppercase tracking-wider text-stone-400 mb-1">
                    Reviewer feedback
                  </p>
                  <p className="text-sm text-stone-600 italic">
                    &ldquo;{s.reviews[0].comments}&rdquo;
                  </p>
                </div>
              )}

              {(s.status === "draft" || s.status === "revision") && (
                <div className="mt-3 pt-3 border-t border-stone-100 flex gap-3">
                  <Link
                    href={`/admin/content/${s.id}/edit`}
                    className="text-xs text-amber-600 hover:underline"
                  >
                    Continue editing →
                  </Link>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}