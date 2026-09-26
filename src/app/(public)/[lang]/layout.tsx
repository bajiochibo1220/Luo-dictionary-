import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { LanguageProvider } from "@/components/providers/language-provider";
import { Header } from "@/components/layout/header";

export default async function LangLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: { lang: string };
}) {
  const language = await prisma.language.findUnique({
    where: { code: params.lang },
    include: {
      moduleTranslations: {
        include: { module: true },
      },
    },
  });

  if (!language || !language.isActive) {
    notFound();
  }

  const moduleTitles: Record<string, string> = {};
  for (const mt of language.moduleTranslations) {
    moduleTitles[mt.module.code] = mt.title;
  }

  return (
    <LanguageProvider
      language={{
        id: language.id,
        code: language.code,
        name: language.name,
        nativeName: language.nativeName,
      }}
      moduleTitles={moduleTitles}
    >
      <div className="min-h-screen bg-stone-50">
        <Header />
        <main className="container mx-auto px-4 py-8">{children}</main>
      </div>
    </LanguageProvider>
  );
}