import Link from "next/link";
import { notFound } from "next/navigation";
import dynamic from "next/dynamic";
import { prisma } from "@/lib/db";

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

export default async function HeritageSiteDetailPage({
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

  const d = record.data as any;
  const images = record.media.filter((m) => m.type === "image");

  return (
    <div className="max-w-5xl mx-auto">
      <Link
        href={`/${language.code}/piny-luo`}
        className="inline-flex items-center text-sm text-stone-500 hover:text-amber-600 mb-6"
      >
        ← Back to Heritage Sites
      </Link>

      <header className="mb-8">
        <span className="text-xs uppercase tracking-wider text-amber-600">
          Heritage Site
        </span>
        <h1 className="text-4xl md:text-5xl font-serif text-stone-800 mt-2 mb-3">
          {record.title}
        </h1>
        {d.county && (
          <p className="text-stone-500">
            <span className="text-stone-400">County:</span> {d.county}
          </p>
        )}
      </header>

      {images.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          {images.slice(0, 2).map((img, i) => (
            <div
              key={i}
              className="aspect-video rounded-xl overflow-hidden bg-stone-100"
            >
              <img
                src={img.url}
                alt={record.title}
                className="w-full h-full object-cover"
              />
            </div>
          ))}
        </div>
      )}

      {d.latitude && d.longitude && (
        <section className="mb-8">
          <h2 className="text-xl font-serif text-stone-700 mb-3">Location</h2>
          <LocationMap
            latitude={d.latitude}
            longitude={d.longitude}
            label={record.title}
            zoom={13}
          />
        </section>
      )}

      {d.description && (
        <section className="bg-white rounded-2xl shadow-sm border border-stone-100 p-8 mb-8">
          <h2 className="text-xs uppercase tracking-wider text-stone-400 mb-2">
            Description
          </h2>
          <p className="text-stone-700 leading-relaxed">{d.description}</p>
        </section>
      )}

      {d.history && (
        <section className="mb-8">
          <h2 className="text-xl font-serif text-stone-700 mb-3">History</h2>
          <p className="text-stone-700 leading-relaxed whitespace-pre-line">
            {d.history}
          </p>
        </section>
      )}

      {d.visiting_info && (
        <section className="bg-gradient-to-br from-amber-50 to-stone-50 rounded-2xl border border-amber-100 p-8 mb-8">
          <h2 className="text-xs uppercase tracking-wider text-amber-700 mb-2">
            Visiting Information
          </h2>
          <p className="text-stone-800 leading-relaxed">{d.visiting_info}</p>
        </section>
      )}

      {record.tags.length > 0 && (
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
      )}
    </div>
  );
}