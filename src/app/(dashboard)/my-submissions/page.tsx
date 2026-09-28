import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { BackLink } from "@/components/layout/back-link";

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
      reviews: { orderBy: { createdAt: "desc" }, take: 1 },
    },
  });

  const statusColors: Record<string, string> = {
    draft: "bg-stone-200 text-stone-700",
    submitted: "bg-amber-100 text-amber-700",
    under_review: "bg-blue-100 text-blue-700",
    validated: "bg-purple-100 text-purple-700",
    published: "bg-green-100 text-green-700",
    rejected: "bg-red-100 text-red-700",
    revision: "bg-amber-100 text-amber-700",
  };

  return (
    <div className="p-6 md:p-10 pt-20 md:pt-10">
      <div className="mb-4">
        <BackLink href="/dashboard" label="Back to dashboard" variant="on-sand" />
      </div>

      <header className="mb-6">
        <h1 className="font-serif text-3xl text-stone-900 mb-1">
          My Submissions
        </h1>
        <p className="text-sm text-stone-800/70">
          {submissions.length}{" "}
          {submissions.length === 1 ? "submission" : "submissions"}
        </p>
      </header>

      {submissions.length === 0 ? (
        <div className="py-20 text-center max-w-xl mx-auto">
          <p className="font-serif text-2xl text-stone-900 mb-3">
            No submissions yet
          </p>
          <p className="text-sm text-stone-800/70 mb-6">
            Start contributing to the cultural repository
          </p>
          <Link
            href="/contribute"
            className="inline-block bg-stone-900 text-amber-50 px-6 py-3 rounded-full text-sm font-semibold hover:bg-amber-900 transition shadow-md"
          >
            Contribute now
          </Link>
        </div>
      ) : (
        <div className="space-y-3 max-w-3xl">
          {submissions.map((s) => (
            <div
              key={s.id}
              className="bg-black/5 backdrop-blur rounded-2xl border border-stone-900/10 p-5"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <p className="text-xs uppercase tracking-wider text-stone-800/60 mb-1 font-semibold">
                    {s.module.baseName} · {s.language.nativeName}
                  </p>
                  <h3 className="text-lg font-serif text-stone-900 mb-1">
                    {s.title}
                  </h3>
                  <p className="text-xs text-stone-800/60">
                    {new Date(s.createdAt).toLocaleString("en-KE", {
                      dateStyle: "medium",
                      timeStyle: "short",
                    })}
                  </p>
                </div>
                <span
                  className={`text-xs px-2 py-1 rounded-full whitespace-nowrap font-semibold ${
                    statusColors[s.status] ?? statusColors.draft
                  }`}
                >
                  {s.status.replace("_", " ")}
                </span>
              </div>

              {s.reviews.length > 0 && s.reviews[0].comments && (
                <div className="mt-3 pt-3 border-t border-stone-900/10">
                  <p className="text-xs uppercase tracking-wider text-stone-800/60 mb-1 font-semibold">
                    Reviewer feedback
                  </p>
                  <p className="text-sm text-stone-800/80 italic">
                    &ldquo;{s.reviews[0].comments}&rdquo;
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}