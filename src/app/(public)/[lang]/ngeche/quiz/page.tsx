import { notFound } from "next/navigation";
import { publicRecordWhere } from "@/lib/governance";
import { prisma } from "@/lib/db";
import { RiddleQuiz } from "@/components/modules/riddles/riddle-quiz";
import { getContentCultureLanguageId, localizeRecord } from "@/lib/content-translations";

export default async function RiddleQuizPage({
  params,
}: {
  params: { lang: string };
}) {
  const language = await prisma.language.findUnique({
    where: { code: params.lang },
  });
  if (!language || !language.isActive) notFound();
  const cultureLanguageId = await getContentCultureLanguageId(language.id);

  const mod = await prisma.module.findUnique({
    where: { code: "riddles" },
  });
  if (!mod) notFound();

  const records = await prisma.culturalRecord.findMany({
    where: { languageId: cultureLanguageId, moduleId: mod.id, ...publicRecordWhere() },
    include: { translations: { where: { languageId: language.id } } },
  });
  const localizedRecords = records.map((record) => localizeRecord(record, language.id));

  // Shuffle on server for each visit
  const shuffled = [...localizedRecords].sort(() => Math.random() - 0.5);

  return (
    <div>
      <header className="mb-8 text-center">
        <h1 className="text-3xl font-serif text-stone-800 mb-2">
          Riddle Quiz
        </h1>
        <p className="text-stone-500">Test your knowledge</p>
      </header>

      <RiddleQuiz riddles={shuffled as any} langCode={language.code} />
    </div>
  );
}
