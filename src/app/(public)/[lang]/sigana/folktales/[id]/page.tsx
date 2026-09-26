import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { FolktaleDetail } from "@/components/modules/folktales/folktale-detail";

export default async function FolktaleDetailPage({
  params,
}: {
  params: { lang: string; id: string };
}) {
  const language = await prisma.language.findUnique({
    where: { code: params.lang },
  });
  if (!language) notFound();

  const record = await prisma.culturalRecord.findUnique({
    where: { id: params.id },
    include: { media: true },
  });
  if (!record) notFound();

  return (
    <FolktaleDetail tale={record as any} langCode={language.code} />
  );
}