import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { RiddleQuiz } from "@/components/modules/riddles/riddle-quiz";

export default async function RiddleQuizPage({
  params,
}: {
  params: { lang: string };
}) {
  const language = await prisma.language.findUnique({
    where: { code: params.lang },
  });
  if (!language || !language.isActive) notFound();

  const mod = await prisma.module.findUnique({
    where: { code: "riddles" },
  });
  if (!mod) notFound();

  const records = await prisma.culturalRecord.findMany({
    where: { languageId: language.id, moduleId: mod.id, status: "published" },
  });

  // Shuffle on server for each visit
  const shuffled = [...records].sort(() => Math.random() - 0.5);

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