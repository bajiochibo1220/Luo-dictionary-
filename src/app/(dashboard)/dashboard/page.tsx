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

  return (
    <div className="p-6 md:p-8">
      <header className="mb-6">
        <p className="text-[10px] uppercase tracking-[0.3em] text-stone-800/60 font-medium mb-1">
          {primaryRole?.languageName ?? "Dholuo"} · Overview
        </p>
        <h2 className="font-serif text-3xl md:text-4xl text-stone-900 leading-tight">
          Welcome{user.name ? `, ${user.name.split(" ")[0]}` : ""}
        </h2>
      </header>

      <div className="rounded-2xl bg-amber-50/95 backdrop-blur border border-stone-900/10 p-8 shadow-lg max-w-2xl">
        <p className="text-base text-stone-800/90 leading-relaxed mb-3">
          Pick a module from the sidebar. Use the media filters to browse
          images, audio, video, or transcripts. Click <strong>Contribute</strong>{" "}
          to add something — it goes straight to that module's review queue.
        </p>
        <p className="text-sm text-stone-800/70 leading-relaxed">
          Your language:{" "}
          <strong className="text-amber-900">
            {primaryRole?.languageName ?? "Dholuo"}
          </strong>
        </p>
      </div>
    </div>
  );
}