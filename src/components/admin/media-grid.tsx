"use client";

import { useState } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

type MediaAsset = {
  id: string;
  type: string;
  url: string;
  publicId: string;
  resourceType: string;
  format: string;
  sizeBytes: bigint | number | string;
  durationSecs?: number | null;
  width?: number | null;
  height?: number | null;
  caption?: string | null;
  thumbnailUrl?: string | null;
  createdAt: string;
  languageId: number;
  nrfMetadata?: unknown;
  language: { code: string; nativeName: string };
  record?: { id: string; title: string; status: string; module: { code: string; baseName?: string } } | null;
};

type PublishedRecord = { id: string; title: string; module: { code: string } };

function getGenre(asset: MediaAsset): string | undefined {
  if (!asset.nrfMetadata || typeof asset.nrfMetadata !== "object") return undefined;
  const genre = (asset.nrfMetadata as { genre?: unknown }).genre;
  return typeof genre === "string" ? genre : undefined;
}

function getModuleLabel(asset: MediaAsset): string {
  return asset.record?.module.baseName || getGenre(asset)?.replace(/[-_]/g, " ") || "Unassigned";
}

function formatBytes(bytes: number | string | bigint): string {
  const n = typeof bytes === "string" ? Number(bytes) : Number(bytes);
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainder = seconds % 60;
  return hours > 0
    ? `${hours}:${String(minutes).padStart(2, "0")}:${String(remainder).padStart(2, "0")}`
    : `${minutes}:${String(remainder).padStart(2, "0")}`;
}

export function MediaGrid({
  assets,
  canDelete,
}: {
  assets: MediaAsset[];
  canDelete: boolean;
}) {
  const router = useRouter();
  const [selected, setSelected] = useState<MediaAsset | null>(null);
  const [busy, setBusy] = useState(false);
  const [records, setRecords] = useState<PublishedRecord[]>([]);
  const [recordId, setRecordId] = useState("");

  async function handleDelete(id: string) {
    if (!confirm("Delete this file permanently from Cloudinary and database?"))
      return;
    setBusy(true);
    try {
      const res = await fetch(`/api/media/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed");
      toast.success("Deleted");
      setSelected(null);
      router.refresh();
    } catch {
      toast.error("Delete failed");
    } finally {
      setBusy(false);
    }
  }

  async function loadPublishedRecords(asset: MediaAsset) {
    setSelected(asset);
    setRecordId("");
    setRecords([]);
    const moduleCode = getGenre(asset);
    if (!moduleCode || asset.record) return;
    try {
      const params = new URLSearchParams({
        languageId: String(asset.languageId),
        module: moduleCode,
        status: "published",
        limit: "100",
      });
      const response = await fetch(`/api/content?${params}`);
      const result = await response.json();
      if (response.ok && result.success) setRecords(result.data);
    } catch {
      toast.error("Could not load published content");
    }
  }

  async function attachToRecord() {
    if (!selected || !recordId) return;
    setBusy(true);
    try {
      const response = await fetch(`/api/media/${selected.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recordId }),
      });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.error || "Could not attach media");
      toast.success("Media attached. It is available on the public content page.");
      setSelected(null);
      router.refresh();
    } catch (error: any) {
      toast.error(error.message || "Could not attach media");
    } finally {
      setBusy(false);
    }
  }

  if (assets.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-stone-100 p-12 text-center text-stone-400">
        No media files yet
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
        {assets.map((a) => (
          <button
            key={a.id}
            onClick={() => void loadPublishedRecords(a)}
            className="group bg-white rounded-xl shadow-sm border border-stone-100 hover:border-amber-300 hover:shadow-lg transition overflow-hidden text-left"
          >
            <div className="aspect-square bg-stone-100 flex items-center justify-center overflow-hidden">
              {a.resourceType === "image" ? (
                <img
                  src={a.thumbnailUrl || a.url}
                  alt={a.caption || a.publicId}
                  className="w-full h-full object-cover group-hover:scale-105 transition"
                />
              ) : a.resourceType === "video" ? (
                a.thumbnailUrl ? (
                  <img
                    src={a.thumbnailUrl}
                    alt={a.caption || a.publicId}
                    className="w-full h-full object-cover group-hover:scale-105 transition"
                  />
                ) : (
                  <span className="text-5xl text-stone-400">🎬</span>
                )
              ) : a.type === "audio" ? (
                <span className="text-5xl text-stone-400">🎵</span>
              ) : (
                <span className="text-5xl text-stone-400">📄</span>
              )}
            </div>
            <div className="p-3">
              <p className="text-xs text-stone-600 truncate capitalize">{a.type} · {getModuleLabel(a)}</p>
              <p className="text-xs text-stone-400 truncate">{a.format}</p>
              <p className="text-xs text-stone-400">
                {formatBytes(a.sizeBytes)}
              </p>
            </div>
          </button>
        ))}
      </div>

      {/* Detail drawer */}
      {selected && (
        <>
          <div
            className="fixed inset-0 bg-black/50 z-40"
            onClick={() => setSelected(null)}
          />
          <aside className="fixed right-0 top-0 bottom-0 w-full max-w-md bg-white z-50 overflow-y-auto shadow-2xl">
            <div className="p-6 border-b border-stone-200 flex items-center justify-between sticky top-0 bg-white z-10">
              <h2 className="text-lg font-serif text-stone-800">Media Detail</h2>
              <button
                onClick={() => setSelected(null)}
                className="text-stone-400 hover:text-stone-700 text-2xl"
              >
                ×
              </button>
            </div>

            <div className="p-6">
              {/* Preview */}
              <div className="bg-stone-100 rounded-lg overflow-hidden mb-4">
                {selected.resourceType === "image" ? (
                  <img
                    src={selected.url}
                    alt={selected.caption || ""}
                    className="w-full"
                  />
                ) : selected.resourceType === "video" ? (
                  <video src={selected.url} controls className="w-full" />
                ) : selected.type === "audio" ? (
                  <audio src={selected.url} controls className="w-full p-4" />
                ) : (
                  <div className="p-8 text-center text-stone-400">
                    <span className="text-5xl">📄</span>
                  </div>
                )}
              </div>

              {/* Metadata */}
              <dl className="space-y-3 text-sm">
                <div>
                  <dt className="text-xs uppercase tracking-wider text-stone-400 mb-1">
                    Type
                  </dt>
                  <dd className="text-stone-700">
                    {selected.type} · {selected.format}
                  </dd>
                </div>

                <div>
                  <dt className="text-xs uppercase tracking-wider text-stone-400 mb-1">
                    Size
                  </dt>
                  <dd className="text-stone-700">
                    {formatBytes(selected.sizeBytes)}
                  </dd>
                </div>

                {selected.width && selected.height && (
                  <div>
                    <dt className="text-xs uppercase tracking-wider text-stone-400 mb-1">
                      Dimensions
                    </dt>
                    <dd className="text-stone-700">
                      {selected.width} × {selected.height}
                    </dd>
                  </div>
                )}

                {selected.durationSecs && (
                  <div>
                    <dt className="text-xs uppercase tracking-wider text-stone-400 mb-1">
                      Duration
                    </dt>
                    <dd className="text-stone-700">
                      {formatDuration(selected.durationSecs)}
                    </dd>
                  </div>
                )}

                <div>
                  <dt className="text-xs uppercase tracking-wider text-stone-400 mb-1">
                    Language
                  </dt>
                  <dd className="text-stone-700">
                    {selected.language.nativeName}
                  </dd>
                </div>

                {selected.record && (
                  <div>
                    <dt className="text-xs uppercase tracking-wider text-stone-400 mb-1">
                      Used in
                    </dt>
                    <dd>
                      <a
                        href={`/admin/content/${selected.record.id}/edit`}
                        className="text-amber-600 hover:underline"
                      >
                        {selected.record.title} · {selected.record.module.code} · {selected.record.status}
                      </a>
                    </dd>
                  </div>
                )}

                {!selected.record && (
                  <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
                    <p className="text-sm font-medium text-amber-900">Not attached to published content</p>
                    <p className="mt-1 text-xs text-amber-800">
                      Uploading a file to the library does not publish it. Attach it to a published {getGenre(selected) || "content"} entry to show it publicly.
                    </p>
                    {getGenre(selected) ? (
                      records.length > 0 ? (
                        <div className="mt-3 space-y-2">
                          <select value={recordId} onChange={(event) => setRecordId(event.target.value)} className="w-full rounded-lg border border-amber-200 bg-white px-3 py-2 text-sm">
                            <option value="">Choose published {getGenre(selected)}</option>
                            {records.map((record) => <option key={record.id} value={record.id}>{record.title}</option>)}
                          </select>
                          <button onClick={() => void attachToRecord()} disabled={!recordId || busy} className="w-full rounded-lg bg-amber-700 px-3 py-2 text-sm font-medium text-white disabled:opacity-50">
                            {busy ? "Attaching..." : "Attach to content"}
                          </button>
                        </div>
                      ) : (
                        <p className="mt-2 text-xs text-amber-800">No published entry is available in this language and area. <a className="font-semibold underline" href={`/admin/content/new/${getGenre(selected)}?languageId=${selected.languageId}`}>Create and publish one</a>, then return here to attach this file.</p>
                      )
                    ) : (
                      <p className="mt-2 text-xs text-amber-800">This file has no content area assigned. Upload it again from the correct content entry.</p>
                    )}
                  </div>
                )}

                <div>
                  <dt className="text-xs uppercase tracking-wider text-stone-400 mb-1">
                    Cloudinary ID
                  </dt>
                  <dd className="text-stone-500 text-xs break-all">
                    {selected.publicId}
                  </dd>
                </div>

                <div>
                  <dt className="text-xs uppercase tracking-wider text-stone-400 mb-1">
                    Uploaded
                  </dt>
                  <dd className="text-stone-700">
                    {new Date(selected.createdAt).toLocaleString("en-KE")}
                  </dd>
                </div>
              </dl>

              {/* Actions */}
              <div className="mt-6 pt-6 border-t border-stone-100 space-y-3">
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(selected.url);
                    toast.success("URL copied");
                  }}
                  className="w-full py-2.5 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-lg text-sm font-medium"
                >
                  Copy URL
                </button>

                <a
                  href={selected.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block w-full py-2.5 text-center bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-lg text-sm font-medium"
                >
                  Open in new tab
                </a>

                {canDelete && (
                  <button
                    onClick={() => handleDelete(selected.id)}
                    disabled={busy}
                    className="w-full py-2.5 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg text-sm font-medium disabled:opacity-50"
                  >
                    {busy ? "Deleting..." : "Delete from Cloudinary"}
                  </button>
                )}
              </div>
            </div>
          </aside>
        </>
      )}
    </>
  );
}
