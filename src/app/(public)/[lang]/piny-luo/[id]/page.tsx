import { CompleteItemDownload } from "@/components/shared/complete-item-download";
import { MediaImage } from "@/components/shared/media-preview";
import { InterfaceText } from "@/components/shared/interface-language";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ClientLocationMap as LocationMap } from "@/components/modules/oral-history/client-location-map";
import { prisma } from "@/lib/db";
import { findLocalizedRecord } from "@/lib/content-translations";
import { EnglishVersionLink } from "@/components/layout/english-version-link";


export default async function HeritageSiteDetailPage({
  params: promisedParams,
}: {
  params: Promise<{ lang: string; id: string }>;
}) {
  const params = await promisedParams;
  const language = await prisma.language.findUnique({
    where: { code: params.lang },
  });
  if (!language) notFound();

  const record = await findLocalizedRecord(params.id, language.id, "heritage_sites");
  if (!record) notFound();

  const d = record.data as any;
  const images = record.media.filter((m) => m.type === "image");

  return (
    <div className="max-w-5xl mx-auto">
      <Link
        href={`/${language.code}/piny-luo`}
        className="inline-flex items-center text-sm text-stone-500 hover:text-amber-600 mb-6"
      ><InterfaceText source="← Back to Heritage Sites" /></Link>

      <header className="mb-8">
        <EnglishVersionLink langCode={language.code} href={`/${language.code}/piny-luo/${record.id}`} />
        <span className="text-xs uppercase tracking-wider text-amber-600"><InterfaceText source="Heritage Site" /></span>
        <h1 className="text-4xl md:text-5xl font-serif text-stone-800 mt-2 mb-3">
          {record.title}
        </h1>
        <CompleteItemDownload id={record.id} />
        {d.county && (
          <p className="text-stone-500">
            <span className="text-stone-400"><InterfaceText source="County:" /></span> {d.county}
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
              <MediaImage
                src={img.url}
                alt={record.title}
                className="w-full h-full object-contain bg-black"
              />
            </div>
          ))}
        </div>
      )}

      {d.latitude && d.longitude && (
        <section className="mb-8">
          <h2 className="text-xl font-serif text-stone-700 mb-3"><InterfaceText source="Location" /></h2>
          <LocationMap
            latitude={d.latitude}
            longitude={d.longitude}
            label={record.title}
            zoom={13}
          />
        </section>
      )}

      {d.description && (
        <section className="bg-white rounded-2xl shadow-xs border border-stone-100 p-8 mb-8">
          <h2 className="text-xs uppercase tracking-wider text-stone-400 mb-2"><InterfaceText source="Description" /></h2>
          <p className="text-stone-700 leading-relaxed">{d.description}</p>
        </section>
      )}

      {d.history && (
        <section className="mb-8">
          <h2 className="text-xl font-serif text-stone-700 mb-3"><InterfaceText source="History" /></h2>
          <p className="text-stone-700 leading-relaxed whitespace-pre-line">
            {d.history}
          </p>
        </section>
      )}

      {d.visiting_info && (
        <section className="bg-linear-to-br from-amber-50 to-stone-50 rounded-2xl border border-amber-100 p-8 mb-8">
          <h2 className="text-xs uppercase tracking-wider text-amber-700 mb-2"><InterfaceText source="Visiting Information" /></h2>
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
