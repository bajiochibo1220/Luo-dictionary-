"use client";
import { InterfaceText } from "./interface-language";
export function CompleteItemDownload({ id, kind = "cultural", origin = "" }: { id: string; kind?: "cultural" | "dictionary"; origin?: string }) {
  const path = `/api/v1/download?id=${encodeURIComponent(id)}&kind=${kind}`;
  const href = origin ? new URL(path, origin).href : path;
  return <div className="mt-3"><a href={href} download target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center rounded-lg bg-teal-800 px-4 py-2 text-sm font-semibold text-white"><InterfaceText source="Download complete item (ZIP)" /></a><p className="mt-1 text-xs text-stone-600"><InterfaceText source="Includes full descriptions, available translations, transcripts and original attached files." /></p></div>;
}
