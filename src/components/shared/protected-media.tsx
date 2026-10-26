"use client";
import { useEffect, useRef, useState } from "react";
type Asset = { id: string; type: string; format?: string | null; caption?: string | null };
// Fetch through the same authenticated transport as the workspace. Raw storage
// URLs cannot carry a native bearer token and must not bypass media governance.
export function ProtectedMedia({ asset, transport = fetch }: { asset: Asset; transport?: typeof fetch }) {
  const [url, setUrl] = useState(""); const [error, setError] = useState(""); const [busy, setBusy] = useState(false);
  const controller = useRef<AbortController | null>(null); const objectUrl = useRef("");
  useEffect(() => () => { controller.current?.abort(); if (objectUrl.current) URL.revokeObjectURL(objectUrl.current); }, [asset.id]);
  async function load() {
    controller.current?.abort(); const current = new AbortController(); controller.current = current; setBusy(true); setError("");
    try {
      const response = await transport(`/api/media/${encodeURIComponent(asset.id)}/file`, { cache: "no-store", signal: current.signal });
      if (!response.ok) throw new Error(response.status === 403 ? "You do not have permission to open this file." : "File unavailable. Refresh the item and try again.");
      if (Number(response.headers.get("content-length") || 0) > 100 * 1024 * 1024) throw new Error("This file is too large to preview on this device.");
      const blob = await response.blob(); if (current.signal.aborted) return;
      if (blob.size > 100 * 1024 * 1024) throw new Error("This file is too large to preview on this device.");
      if (objectUrl.current) URL.revokeObjectURL(objectUrl.current);
      objectUrl.current = URL.createObjectURL(blob); setUrl(objectUrl.current);
    } catch (reason) { if (!current.signal.aborted) setError(reason instanceof Error ? reason.message : "Unable to open file."); }
    finally { if (!current.signal.aborted) setBusy(false); }
  }
  return <figure className="space-y-2 rounded-lg border border-stone-300 p-3"><figcaption>{asset.caption || asset.type}{asset.format ? ` · ${asset.format}` : ""}</figcaption>
    {!url && <button type="button" className="min-h-11 underline disabled:opacity-50" disabled={busy} onClick={() => void load()}>{busy ? "Opening…" : "Open attached file"}</button>}
    {error && <p role="alert">{error}</p>}
    {url && <>{asset.type === "image" ? <img src={url} alt={asset.caption || "Attached image for review"} className="max-h-96 max-w-full object-contain" /> : asset.type === "audio" ? <audio controls preload="metadata" src={url} className="max-w-full" /> : asset.type === "video" ? <video controls preload="metadata" src={url} className="max-h-96 max-w-full" /> : null}<a href={url} download={`attachment-${asset.id}.${/^[a-z0-9]{1,8}$/i.test(asset.format || "") ? asset.format : "bin"}`} className="inline-flex min-h-11 items-center underline">Save file on this device</a><button type="button" className="ml-4 min-h-11 underline" onClick={() => { URL.revokeObjectURL(objectUrl.current); objectUrl.current = ""; setUrl(""); }}>Close file</button></>}
  </figure>;
}
