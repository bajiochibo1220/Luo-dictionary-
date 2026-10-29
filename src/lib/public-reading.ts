import { prisma } from "@/lib/db";
import { publicRecordWhere, publicGovernanceWhere } from "@/lib/governance";
import { publicCulturalText } from "@/lib/public-cultural-text";
import { orderedTranscriptSegments, PublicReadingSchema } from "./reading-contract";

export async function getPublicReading(id: string) {
  const record = await prisma.culturalRecord.findFirst({
    where: { id, ...publicRecordWhere(), language: { isActive: true }, module: { isActive: true, isStub: false } },
    select: {
      id: true, title: true, data: true,
      language: { select: { code: true, nativeName: true } },
      translations: { where: { language: { code: "eng", isActive: true } }, select: { data: true } },
      transcripts: { where: publicGovernanceWhere(), select: { id: true, text: true, languageCode: true, speakerRole: true, sourceId: true, createdAt: true } },
      publicationOf: { select: { transcripts: { select: { id: true, text: true, languageCode: true, speakerRole: true, sourceId: true, createdAt: true } } } },
    },
  });
  if (!record) return null;
  return PublicReadingSchema.parse({
    id: record.id, title: record.title,
    sourceLanguageCode: record.language.code, sourceLanguageName: record.language.nativeName,
    sourceText: publicCulturalText(record.data),
    englishText: record.language.code === "eng" ? publicCulturalText(record.data) : publicCulturalText(record.translations[0]?.data),
    transcripts: orderedTranscriptSegments(record.transcripts, record.publicationOf?.transcripts),
  });
}
