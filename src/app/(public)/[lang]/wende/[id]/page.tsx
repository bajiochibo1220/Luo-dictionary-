import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { SongDetail } from "@/components/modules/songs/song-detail";
import { findLocalizedRecord } from "@/lib/content-translations";

export default async function SongDetailPage({
  params,
}: {
  params: { lang: string; id: string };
}) {
  const language = await prisma.language.findUnique({
    where: { code: params.lang },
  });
  if (!language) notFound();

  const record = await findLocalizedRecord(params.id, language.id, "songs");
  if (!record) notFound();

  return <SongDetail song={record as any} langCode={language.code} />;
}
