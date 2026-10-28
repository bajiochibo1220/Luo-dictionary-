"use client";
import { CompleteItemDownload } from "@/components/shared/complete-item-download";
import { MediaAudio, MediaImage, MediaVideo } from "@/components/shared/media-preview";

import { InterfaceText } from "@/components/shared/interface-language";

import Link from "next/link";
import { useState } from "react";
import { EnglishVersionLink } from "@/components/layout/english-version-link";

type Props = {
  song: {
    id: string;
    title: string;
    data: {
      lyrics?: string;
      translation?: string;
      meaning?: string;
      instruments?: string;
      cultural_context?: string;
      notation?: string;
    };
    media: { id?: string; url: string; type: string; thumbnailUrl?: string | null }[];
    tags: string[];
  };
  langCode: string;
};

export function SongDetail({ song, langCode }: Props) {
  const d = song.data;
  const [showTranslation, setShowTranslation] = useState(true);
  const audio = song.media.find((m) => m.type === "audio");

  const instruments = (d.instruments || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  const lyricLines = (d.lyrics || "").split("\n").filter((l) => l.trim());
  const translationLines = (d.translation || "")
    .split("\n")
    .filter((l) => l.trim());

  return (
    <div className="max-w-4xl mx-auto">
      <Link
        href={`/${langCode}/wende`}
        className="inline-flex items-center text-sm text-stone-500 hover:text-amber-600 mb-6"
      ><InterfaceText source="← Back to Songs" /></Link>

      <header className="mb-8">
        <EnglishVersionLink langCode={langCode} href={`/${langCode}/wende/${song.id}`} />
        <span className="text-xs uppercase tracking-wider text-amber-600"><InterfaceText source="Traditional Song" /></span>
        <h1 className="text-4xl md:text-5xl font-serif text-stone-800 mt-2 mb-4">
          {song.title}
        </h1>

        {instruments.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-4">
            {instruments.map((inst, i) => (
              <span
                key={i}
                className="inline-flex items-center gap-1 text-sm px-3 py-1 bg-amber-50 text-amber-700 rounded-full"
              >
                🎵 {inst}
              </span>
            ))}
          </div>
        )}
      </header>
      <CompleteItemDownload id={song.id} />

      {audio && (
        <div className="bg-white rounded-xl shadow-xs border border-stone-100 p-6 mb-8">
          <p className="text-xs uppercase tracking-wider text-stone-400 mb-3"><InterfaceText source="Listen" /></p>
          <MediaAudio controls className="w-full" src={audio.url}><InterfaceText source="Your browser does not support audio." /></MediaAudio>
        </div>
      )}

      {song.media.filter((item) => item.type !== "audio").map((item, index) => (
        <div key={item.id ?? index} className="mb-5 bg-white rounded-xl border border-stone-100 p-5">
          {item.type === "image" ? <MediaImage src={item.url} alt={song.title} className="w-full max-h-[32rem] object-contain rounded-lg" /> :
            item.type === "video" ? <MediaVideo src={item.url} poster={item.thumbnailUrl ?? undefined} controls className="w-full max-h-[32rem] rounded-lg bg-stone-950" /> :
            <a href={item.url} target="_blank" rel="noreferrer" className="text-amber-800 underline"><InterfaceText source="Open transcript or document" /></a>}
        </div>
      ))}

      {!audio && (
        <div className="bg-stone-50 rounded-xl border border-stone-200 p-6 mb-8 text-center text-sm text-stone-500"><InterfaceText source="Audio recording not yet uploaded" /></div>
      )}

      {(lyricLines.length > 0 || translationLines.length > 0) && (
        <section className="bg-white rounded-2xl shadow-xs border border-stone-100 p-8 md:p-12 mb-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xs uppercase tracking-wider text-stone-400"><InterfaceText source="Lyrics" /></h2>
            {d.translation && (
              <button
                onClick={() => setShowTranslation(!showTranslation)}
                className={`text-xs uppercase tracking-wider px-3 py-1.5 rounded-full border transition ${
                  showTranslation
                    ? "bg-amber-600 text-white border-amber-600"
                    : "bg-white text-stone-600 border-stone-200 hover:border-amber-400"
                }`}
              >
                <InterfaceText source={showTranslation ? "Hide translation" : "Show translation"} />
              </button>
            )}
          </div>

          <div
            className={showTranslation && translationLines.length > 0
                ? "grid grid-cols-1 md:grid-cols-2 gap-8"
                : ""}
          >
            <div>
              {showTranslation && translationLines.length > 0 && (
                <p className="text-xs uppercase tracking-wider text-stone-400 mb-3 md:hidden"><InterfaceText source="Dholuo" /></p>
              )}
              <div className="space-y-2">
                {lyricLines.map((line, i) => (
                  <p
                    key={i}
                    className="text-lg font-serif text-stone-800 leading-relaxed"
                  >
                    {line}
                  </p>
                ))}
              </div>
            </div>

            {showTranslation && translationLines.length > 0 && (
              <div className="md:border-l md:border-stone-100 md:pl-8">
                <p className="text-xs uppercase tracking-wider text-stone-400 mb-3"><InterfaceText source="English" /></p>
                <div className="space-y-2">
                  {translationLines.map((line, i) => (
                    <p
                      key={i}
                      className="text-stone-600 italic leading-relaxed"
                    >
                      {line}
                    </p>
                  ))}
                </div>
              </div>
            )}
          </div>
        </section>
      )}

      {d.meaning && (
        <section className="bg-linear-to-br from-amber-50 to-stone-50 rounded-2xl border border-amber-100 p-8 mb-8">
          <p className="text-xs uppercase tracking-wider text-amber-700 mb-2"><InterfaceText source="Meaning" /></p>
          <p className="text-lg text-stone-800 leading-relaxed">{d.meaning}</p>
        </section>
      )}

      {d.notation && (
        <section className="bg-white rounded-xl shadow-xs border border-stone-100 p-6 mb-8">
          <p className="text-xs uppercase tracking-wider text-stone-400 mb-3"><InterfaceText source="Musical Notation" /></p>
          <pre className="text-sm text-stone-700 whitespace-pre-wrap font-mono bg-stone-50 p-4 rounded-sm">
            {d.notation}
          </pre>
        </section>
      )}

      {d.cultural_context && (
        <section className="mb-8">
          <h2 className="text-lg font-serif text-stone-800 mb-3"><InterfaceText source="Cultural Context" /></h2>
          <p className="text-stone-700 leading-relaxed">
            {d.cultural_context}
          </p>
        </section>
      )}

      {song.tags.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {song.tags.map((t) => (
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
