import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { ModuleContent } from "@/components/layout/module-content";

export default async function UserDashboardPage({
  searchParams,
}: {
  searchParams: { module?: string };
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const user = session.user as any;
  const languageRoles = (user.languageRoles ?? []) as any[];
  const primaryRole = languageRoles[0];
  const languageId = primaryRole?.languageId;
  const languageCode = primaryRole?.languageCode ?? "luo";

  // ── Module view
  if (searchParams.module && languageId) {
    const mod = await prisma.module.findUnique({
      where: { code: searchParams.module },
      include: { translations: { where: { languageId } } },
    });

    if (mod) {
      const title = mod.translations[0]?.title ?? mod.baseName;

      const records = await prisma.culturalRecord.findMany({
        where: { languageId, moduleId: mod.id, status: "published" },
        orderBy: { createdAt: "desc" },
        take: 50,
        include: { media: true },
      });

      const items = records.map((r) => ({
        id: r.id,
        title: r.title,
        summary: r.summary,
        media: r.media.map((m) => ({
          id: m.id,
          type: m.type,
          url: m.url,
          thumbnailUrl: m.thumbnailUrl,
          format: m.format,
        })),
      }));

      return (
        <ModuleContent
          title={title}
          baseName={mod.baseName}
          languageName={primaryRole?.languageName ?? "Dholuo"}
          languageCode={languageCode}
          languageId={languageId}
          moduleCode={mod.code}
          items={items}
        />
      );
    }
  }

  // ── Overview: text sits directly on the sand background
  return (
    <div className="p-6 md:p-10 pt-20 md:pt-12">
      <header className="mb-8">
        <p className="text-[10px] uppercase tracking-[0.3em] text-stone-800/60 font-semibold mb-2">
          {primaryRole?.languageName ?? "Dholuo"} · Overview
        </p>
        <h2 className="font-serif text-4xl md:text-5xl text-stone-900 leading-tight mb-3">
          Welcome{user.name ? `, ${user.name.split(" ")[0]}` : ""}
        </h2>
        <div className="w-16 h-1 bg-amber-800/70 rounded-full" />
      </header>

      <div className="max-w-2xl space-y-4">
        <p className="text-lg md:text-xl text-stone-900/90 leading-relaxed font-serif">
          Pick a module from the sidebar to explore or contribute.
        </p>
        <p className="text-base text-stone-800/80 leading-relaxed">
          Use the filter tabs at the top of each module to browse by{" "}
          <span className="font-semibold text-amber-900">images</span>,{" "}
          <span className="font-semibold text-amber-900">audio</span>,{" "}
          <span className="font-semibold text-amber-900">video</span>, or{" "}
          <span className="font-semibold text-amber-900">transcripts</span>.
        </p>
        <p className="text-base text-stone-800/80 leading-relaxed">
          Your language:{" "}
          <strong className="text-amber-900 font-semibold">
            {primaryRole?.languageName ?? "Dholuo"}
          </strong>
        </p>
      </div>
    </div>
  );
}