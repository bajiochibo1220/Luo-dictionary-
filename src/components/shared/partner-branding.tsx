"use client";
import { useEffect, useState } from "react";
import type { FeatureRequest } from "./learning-hub";

export function PartnerBranding({ request, variant = "compact" }: { request?: FeatureRequest; variant?: "compact" | "auth" | "footer" }) {
  const [data, setData] = useState<Record<string, string>>({});
  useEffect(() => {
    let active = true;
    const refresh = () => {
      const result = request ? request("/api/branding") : fetch("/api/branding").then(async response => { if (!response.ok) throw new Error(); return (await response.json()).data; });
      void result.then(value => { if (active) { setData(value); for (const partner of ["jooust", "nrf"]) { const colour = value[`${partner}_color`]; if (/^#[a-f0-9]{6}$/i.test(colour || "")) document.documentElement.style.setProperty(`--${partner}-brand`, colour); } } }).catch(() => {});
    };
    refresh(); window.addEventListener("branding-updated", refresh);
    return () => { active = false; window.removeEventListener("branding-updated", refresh); };
  }, [request]);
  return <div className={`partner-branding partner-branding-${variant}`} aria-label="Institutional partners" data-partner-branding={variant}>
    {[{ key: "jooust", name: "JOOUST", full: "Jaramogi Oginga Odinga University of Science and Technology" }, { key: "nrf", name: "NRF", full: "National Research Fund" }].map(partner => <span key={partner.key} title={partner.full} className="partner-mark" style={{ borderColor: /^#[a-f0-9]{6}$/i.test(data[`${partner.key}_color`] || "") ? data[`${partner.key}_color`] : "currentColor" }}>{data[`${partner.key}_logo_url`] ? <img src={data[`${partner.key}_logo_url`]} alt={partner.name} className="partner-logo" /> : <span>{partner.name}</span>}{variant === "auth" && <span className="partner-caption">{partner.full}</span>}</span>)}
  </div>;
}

export function PartnerBrandingSettings({ request, transport = fetch }: { request: FeatureRequest; transport?: typeof fetch }) {
  const [busy, setBusy] = useState(false), [message, setMessage] = useState("");
  const [colours, setColours] = useState<Record<string, string>>({});
  useEffect(() => { let active = true; void request("/api/branding").then(value => { if (active) setColours(value); }).catch(() => {}); return () => { active = false; }; }, [request]);
  return <section className="space-y-4 rounded-xl border border-stone-300 bg-white p-4 text-stone-900"><h2 className="font-serif text-xl">Institution logos &amp; colours</h2><p className="text-sm">Upload the approved JOOUST and NRF logos and choose their official colours. They appear on sign-in screens and in organised public and staff page footers. PNG, JPEG or WebP, up to 2 MB.</p><PartnerBranding request={request} />
    {["jooust", "nrf"].map(partner => <form key={partner} className="flex flex-wrap items-end gap-3 border-t py-3" onSubmit={async event => { event.preventDefault(); setBusy(true); setMessage(""); try { const form = new FormData(event.currentTarget); const file = form.get("file"); if (file instanceof File && file.size) { form.set("partner", partner); const response = await transport("/api/super-admin/branding", { method: "POST", body: form }); const result = await response.json(); if (!response.ok) throw new Error(result.error || "Logo upload failed."); } await request("/api/super-admin/settings", { method: "PATCH", body: JSON.stringify({ [`${partner}_color`]: form.get("color") }) }); window.dispatchEvent(new Event("branding-updated")); setMessage(`${partner.toUpperCase()} branding saved.`); } catch (error) { setMessage(error instanceof Error ? error.message : "Could not save branding."); } finally { setBusy(false); } }}><label className="min-w-0 flex-1">{partner.toUpperCase()} logo<input type="file" name="file" accept="image/png,image/jpeg,image/webp" className="block w-full py-2 text-sm" /></label><label>Official colour<input type="color" name="color" key={colours[`${partner}_color`]} defaultValue={colours[`${partner}_color`] || "#6b4724"} className="block h-11 w-16" /></label><button disabled={busy} className="min-h-11 rounded-lg bg-amber-900 px-4 text-white disabled:opacity-50">Save {partner.toUpperCase()}</button></form>)}
    {message && <p role="status">{message}</p>}
  </section>;
}
