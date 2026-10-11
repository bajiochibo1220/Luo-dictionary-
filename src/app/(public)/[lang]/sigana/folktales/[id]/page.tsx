import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { FolktaleDetail } from "@/components/modules/folktales/folktale-detail";
import { findLocalizedRecord } from "@/lib/content-translations";

export default async function FolktaleDetailPage({
  params: promisedParams,
}: {
  params: Promise<{ lang: string; id: string }>;
}) {
  const params = await promisedParams;
  const language = await prisma.language.findUnique({
    where: { code: params.lang },
  });
  if (!language) notFound();

  const record = await findLocalizedRecord(params.id, language.id, "folktales");
  if (!record) notFound();

  return (
    <FolktaleDetail tale={record as any} langCode={language.code} />
  );
}
