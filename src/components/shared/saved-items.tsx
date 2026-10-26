"use client";
import { useCallback, useEffect, useState } from "react";
import type { FeatureRequest } from "./learning-hub";
import type { AppLink } from "./module-content-view";
export function SavedItems({ request, Link }: { request: FeatureRequest; Link: AppLink }) {
  const [items, setItems] = useState<any[]>([]); const [error, setError] = useState("");
  const reload = useCallback(async () => { setError(""); try { setItems((await request("/api/v1/saved")).items); } catch (reason) { setError(reason instanceof Error ? reason.message : "Unable to load saved items."); } }, [request]);
  useEffect(() => { void reload(); }, [reload]);
  return <section className="mx-auto max-w-3xl space-y-5 p-5"><h1 className="workspace-heading font-serif text-3xl">Saved words &amp; items</h1><button onClick={() => void reload()} className="min-h-11 underline">Refresh</button>{error && <p role="alert">{error}</p>}{!items.length && !error && <p>No saved items. Save approved words, cultural items and lessons from their collections.</p>}{items.map(item => <article key={`${item.kind}:${item.id}`} className="space-y-3 rounded-xl bg-white/80 p-5"><h2 className="font-serif text-xl">{item.title}</h2><p>{item.summary}</p><Link href={item.href} className="inline-block min-h-11 underline">Open collection</Link><button className="ml-4 min-h-11 underline" onClick={async () => { try { await request("/api/v1/saved", { method: "POST", body: JSON.stringify({ action: "remove", kind: item.kind, resourceId: item.id }) }); await reload(); } catch (reason) { setError(reason instanceof Error ? reason.message : "Could not remove item."); } }}>Remove saved item</button></article>)}</section>;
}
