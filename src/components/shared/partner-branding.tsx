"use client";
import { InterfaceText } from "@/components/shared/interface-language";
import { useEffect, useState } from "react";
import type { FeatureRequest } from "./learning-hub";

export function PartnerBranding({ request, variant = "compact" }: { request?: FeatureRequest; variant?: "compact" | "auth" | "footer" }) {
  const [data, setData] = useState<Record<string, string>>({});
  const [naturalWidth, setNaturalWidth] = useState(0);
  useEffect(() => {
    let active = true;
    const refresh = () => {
      const result = request ? request("/api/branding") : fetch("/api/branding").then(async response => { if (!response.ok) throw new Error(); return (await response.json()).data; });
      void result.then(value => { if (active) { setData(value); const colour = value.jooust_color; if (/^#[a-f0-9]{6}$/i.test(colour || "")) document.documentElement.style.setProperty("--jooust-brand", colour); } }).catch(() => {});
    };
    refresh(); window.addEventListener("branding-updated", refresh);
    return () => { active = false; window.removeEventListener("branding-updated", refresh); };
  }, [request]);
  return <div aria-hidden="true" data-institution-background="jooust" className={variant === "auth" ? "auth-logo-background" : "institution-logo-background"}>
    {data.jooust_logo_url && <img src={data.jooust_logo_url} alt="" className={variant === "auth" ? "auth-logo-image" : "institution-logo-image"} onLoad={event=>setNaturalWidth(event.currentTarget.naturalWidth)} style={naturalWidth?{maxWidth:`${Math.min(naturalWidth,320)}px`}:undefined}/>}
  </div>;
}

export function PartnerBrandingSettings({ request, transport = fetch }: { request: FeatureRequest; transport?: typeof fetch }) {
  const [busy, setBusy] = useState(false), [message, setMessage] = useState("");
  const [colours, setColours] = useState<Record<string, string>>({});
  useEffect(() => { let active = true; void request("/api/branding").then(value => { if (active) setColours(value); }).catch(() => {}); return () => { active = false; }; }, [request]);
  return <section className="space-y-4 rounded-xl border border-stone-300 bg-white p-4 text-stone-900"><h2 className="font-serif text-xl"><InterfaceText source="Background & appearance" /></h2><p className="text-sm"><InterfaceText source="Upload the approved JOOUST logo for the page background and choose its official colour. Use a clear PNG, JPEG or WebP, up to 2 MB. The logo keeps its proportions and leaves the content controls usable." /></p>
    {["jooust"].map(partner => <form key={partner} className="flex flex-wrap items-end gap-3 border-t py-3" onSubmit={async event => { event.preventDefault(); setBusy(true); setMessage(""); try { const form = new FormData(event.currentTarget); const file = form.get("file"); if (file instanceof File && file.size) { form.set("partner", partner); const response = await transport("/api/super-admin/branding", { method: "POST", body: form }); const result = await response.json(); if (!response.ok) throw new Error(result.error || "Logo upload failed."); } await request("/api/super-admin/settings", { method: "PATCH", body: JSON.stringify({ [`${partner}_color`]: form.get("color") }) }); window.dispatchEvent(new Event("branding-updated")); setMessage("JOOUST background saved."); } catch (error) { setMessage(error instanceof Error ? error.message : "Could not save branding."); } finally { setBusy(false); } }}><label className="min-w-0 flex-1"><InterfaceText source="JOOUST background logo" /><input type="file" name="file" accept="image/png,image/jpeg,image/webp" className="block w-full py-2 text-sm" /></label><label><InterfaceText source="Official colour" /><input type="color" name="color" key={colours[`${partner}_color`]} defaultValue={colours[`${partner}_color`] || "#6b4724"} className="block h-11 w-16" /></label><button disabled={busy} className="min-h-11 rounded-lg bg-amber-900 px-4 text-white disabled:opacity-50"><InterfaceText source="Save background" /></button></form>)}
    {message && <p role="status">{message}</p>}
  </section>;
}
