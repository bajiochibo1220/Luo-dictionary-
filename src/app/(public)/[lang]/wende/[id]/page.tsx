import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { SongDetail } from "@/components/modules/songs/song-detail";

export default async function SongDetailPage({
  params,
}: {
  params: { lang: string; id: string };
}) {
  const language = await prisma.language.findUnique({
    where: { code: params.lang },
  });
  if (!language) notFound();

  const record = await prisma.culturalRecord.findUnique({
    where: { id: params.id, languageId: language.id, status: "published", module: { code: "songs" } },
    include: { media: true },
  });
  if (!record) notFound();

  return <SongDetail song={record as any} langCode={language.code} />;
}
