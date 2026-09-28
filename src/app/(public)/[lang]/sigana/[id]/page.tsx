import Link from "next/link";
import { notFound } from "next/navigation";
import dynamic from "next/dynamic";
import { prisma } from "@/lib/db";
import { TranscriptViewer } from "@/components/modules/oral-history/transcript-viewer";
import { SummarizeButton } from "@/components/admin/summarize-button";

const LocationMap = dynamic(
  () =>
    import("@/components/modules/oral-history/location-map").then(
      (m) => m.LocationMap
    ),
  {
    ssr: false,
    loading: () => (
      <div className="h-80 bg-stone-100 rounded-xl flex items-center justify-center text-stone-400 text-sm">
        Loading map...
      </div>
    ),
  }
);

const COUNTY_COORDS: Record<string, [number, number]> = {
  "Homa Bay": [-0.5273, 34.4571],
  Kisumu: [-0.0917, 34.768],
  Siaya: [0.0607, 34.2883],
  Migori: [-1.0634, 34.4731],
  "Homa bay": [-0.5273, 34.4571],
};

export default async function OralHistoryDetailPage({
  params,
}: {
  params: { lang: string; id: string };
}) {
  const language = await prisma.language.findUnique({
    where: { code: params.lang },
  });
  if (!language) notFound();

  const record = await prisma.culturalRecord.findUnique({
    where: { id: params.id, languageId: language.id, status: "published", module: { code: "oral_histories" } },
    include: { media: true, transcripts: true },
  });
  if (!record) notFound();

  const d = record.data as any;
  const coords = d.county ? COUNTY_COORDS[d.county] : undefined;

  return (
    <div className="max-w-5xl mx-auto">
      <Link
        href={`/${language.code}/sigana`}
        className="inline-flex items-center text-sm text-stone-500 hover:text-amber-600 mb-6"
      >
        ← Back to Oral Histories
      </Link>

      <header className="mb-8">
        <span className="text-xs uppercase tracking-wider text-amber-600">
          Oral History
        </span>
        <h1 className="text-4xl md:text-5xl font-serif text-stone-800 mt-2 mb-3">
          {record.title}
        </h1>

        <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-stone-500">
          {d.narrator && (
            <span>
              <span className="text-stone-400">Narrated by:</span>{" "}
              {d.narrator}
            </span>
          )}
          {d.community && (
            <span>
              <span className="text-stone-400">Community:</span>{" "}
              {d.community}
            </span>
          )}
          {d.clan && (
            <span>
              <span className="text-stone-400">Clan:</span> {d.clan}
            </span>
          )}
          {d.county && (
            <span>
              <span className="text-stone-400">County:</span> {d.county}
            </span>
          )}
          {d.recorded_date && (
            <span>
              <span className="text-stone-400">Recorded:</span>{" "}
              {d.recorded_date}
            </span>
          )}
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">
        <div>
          {record.media.length > 0 ? (
            <div className="bg-white rounded-xl shadow-sm border border-stone-100 p-6 mb-4">
              <p className="text-xs uppercase tracking-wider text-stone-400 mb-3">
                Audio Recording
              </p>
              <audio
                controls
                className="w-full"
                src={record.media.find((m) => m.type === "audio")?.url}
              >
                Your browser does not support audio.
              </audio>
            </div>
          ) : (
            <div className="bg-stone-50 rounded-xl border border-stone-200 p-6 mb-4 text-center text-sm text-stone-500">
              Audio recording not yet uploaded
            </div>
          )}

          {record.summary ? (
            <div className="bg-gradient-to-br from-amber-50 to-stone-50 rounded-xl border border-amber-100 p-6">
              <p className="text-xs uppercase tracking-wider text-amber-700 mb-3">
                ✨ AI Summary
              </p>
              <p className="text-stone-700 leading-relaxed">
                {record.summary}
              </p>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-stone-100 p-6 text-center">
              <p className="text-xs uppercase tracking-wider text-stone-400 mb-3">
                AI Summary
              </p>
              <p className="text-sm text-stone-500 mb-3">
                Generate an AI summary of this transcript
              </p>
              <SummarizeButton recordId={record.id} />
            </div>
          )}
        </div>

        <div>
          <div className="bg-white rounded-xl shadow-sm border border-stone-100 p-6">
            <p className="text-xs uppercase tracking-wider text-stone-400 mb-3">
              Transcript
            </p>
            <div className="max-h-96 overflow-y-auto pr-2">
              <TranscriptViewer text={d.transcript || ""} />
            </div>
          </div>
        </div>
      </div>

      {coords && (
        <section className="mb-12">
          <h2 className="text-xl font-serif text-stone-700 mb-3">
            Location
          </h2>
          <LocationMap
            latitude={coords[0]}
            longitude={coords[1]}
            label={`${d.county}${d.community ? ` · ${d.community}` : ""}`}
          />
        </section>
      )}

      {record.tags.length > 0 && (
        <section>
          <h2 className="text-xs uppercase tracking-wider text-stone-400 mb-2">
            Themes
          </h2>
          <div className="flex flex-wrap gap-2">
            {record.tags.map((t) => (
              <span
                key={t}
                className="text-xs px-3 py-1 bg-amber-50 text-amber-700 rounded-full"
              >
                {t}
              </span>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
