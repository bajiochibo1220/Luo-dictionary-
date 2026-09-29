"use client";

import { useState } from "react";
import Link from "next/link";
import { EnglishVersionLink } from "@/components/layout/english-version-link";

type Artifact = {
  id: string;
  title: string;
  data: {
    description?: string;
    origin?: string;
    clan?: string;
    usage?: string;
    metadata?: any;
  };
  media: { url: string; type: string; thumbnailUrl?: string | null }[];
  tags: string[];
};

export function ArtifactGrid({
  artifacts,
  langCode,
}: {
  artifacts: Artifact[];
  langCode: string;
}) {
  const [lightbox, setLightbox] = useState<string | null>(null);

  if (artifacts.length === 0) {
    return (
      <div className="text-center py-16 text-stone-400">
        <p className="text-lg">No artifacts published yet</p>
        <p className="text-sm mt-2">
          Cultural artifacts are being documented
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {artifacts.map((a) => {
          const image = a.media.find((m) => m.type === "image");
          return (
            <div
              key={a.id}
              className="group bg-white rounded-xl shadow-sm hover:shadow-lg transition-all border border-stone-100 hover:border-amber-300 overflow-hidden"
            >
              <button
                onClick={() =>
                  image && setLightbox(image.url)
                }
                className="w-full aspect-square bg-stone-100 flex items-center justify-center overflow-hidden"
              >
                {image ? (
                  <img
                    src={image.thumbnailUrl || image.url}
                    alt={a.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                ) : (
                  <span className="text-5xl text-stone-300">🏺</span>
                )}
              </button>

              <div className="p-5">
                <EnglishVersionLink langCode={langCode} href={`/${langCode}/gik-luo/${a.id}`} />
                <h3 className="text-lg font-serif text-stone-800 mb-1">
                  {a.title}
                </h3>
                {a.data.origin && (
                  <p className="text-xs text-stone-500 mb-2">
                    Origin: {a.data.origin}
                  </p>
                )}
                {a.data.description && (
                  <p className="text-sm text-stone-600 line-clamp-2 mb-3">
                    {a.data.description}
                  </p>
                )}
                <Link
                  href={`/${langCode}/gik-luo/${a.id}`}
                  className="text-xs uppercase tracking-wider text-amber-600 hover:text-amber-700"
                >
                  View details →
                </Link>
              </div>
            </div>
          );
        })}
      </div>

      {/* Lightbox */}
      {lightbox && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4 cursor-pointer"
          onClick={() => setLightbox(null)}
        >
          <img
            src={lightbox}
            alt="Artifact"
            className="max-w-full max-h-full rounded-lg shadow-2xl"
          />
          <button
            onClick={() => setLightbox(null)}
            className="absolute top-4 right-4 text-white text-3xl hover:text-amber-400"
          >
            ×
          </button>
        </div>
      )}
    </>
  );
}
