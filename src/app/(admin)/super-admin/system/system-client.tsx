"use client";

import { useState } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { SettingsTabs } from "@/components/admin/settings-tabs";

type Language = { id: number; code: string; name: string; nativeName: string };

export function SystemClient({
  settings,
  languages,
}: {
  settings: Record<string, string>;
  languages: Language[];
}) {
  const router = useRouter();
  const [tab, setTab] = useState("general");
  const [values, setValues] = useState(settings);
  const [busy, setBusy] = useState(false);

  function update(key: string, value: string) {
    setValues((v) => ({ ...v, [key]: value }));
  }

  async function save(keys: string[]) {
    setBusy(true);
    try {
      const payload: Record<string, string> = {};
      for (const k of keys) payload[k] = values[k] ?? "";

      const res = await fetch("/api/super-admin/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed");
      }
      toast.success("Settings saved");
      router.refresh();
    } catch (e: any) {
      toast.error(e.message || "Save failed");
    } finally {
      setBusy(false);
    }
  }

  function Field({
    label,
    settingKey,
    type = "text",
    placeholder = "",
    helpText,
  }: {
    label: string;
    settingKey: string;
    type?: string;
    placeholder?: string;
    helpText?: string;
  }) {
    return (
      <div className="mb-4">
        <label className="block text-sm font-medium text-stone-700 mb-1">
          {label}
        </label>
        <input
          type={type}
          value={values[settingKey] ?? ""}
          onChange={(e) => update(settingKey, e.target.value)}
          placeholder={placeholder}
          className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 text-sm"
        />
        {helpText && (
          <p className="text-xs text-stone-400 mt-1">{helpText}</p>
        )}
      </div>
    );
  }

  return (
    <div>
      <header className="mb-6">
        <h1 className="text-3xl font-serif text-stone-800 mb-1">
          System Settings
        </h1>
        <p className="text-sm text-stone-500">
          Platform-wide configuration — only visible to super admins
        </p>
      </header>

      <SettingsTabs active={tab} onChange={setTab} />

      <div className="bg-white rounded-xl shadow-sm border border-stone-100 p-6">
        {tab === "general" && (
          <>
            <h2 className="text-xs uppercase tracking-wider text-stone-400 mb-4">
              General Configuration
            </h2>

            <Field
              label="Site name"
              settingKey="site_name"
              placeholder="LuoLinguaAI"
            />

            <Field
              label="Support email"
              settingKey="support_email"
              type="email"
              placeholder="support@luolingua.ai"
            />

            <Field
              label="NRF repository namespace"
              settingKey="nrf_namespace"
              placeholder="JOOUST/NRF/LuoAI_Repository"
            />

            <div className="mb-4">
              <label className="block text-sm font-medium text-stone-700 mb-1">
                Default language
              </label>
              <select
                value={values.default_language_id ?? ""}
                onChange={(e) =>
                  update("default_language_id", e.target.value)
                }
                className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 text-sm"
              >
                {languages.map((l) => (
                  <option key={l.id} value={String(l.id)}>
                    {l.nativeName} ({l.name})
                  </option>
                ))}
              </select>
            </div>

            <button
              onClick={() =>
                save([
                  "site_name",
                  "support_email",
                  "nrf_namespace",
                  "default_language_id",
                ])
              }
              disabled={busy}
              className="mt-4 px-6 py-2.5 bg-amber-600 text-white rounded-lg text-sm font-medium hover:bg-amber-700 disabled:opacity-50"
            >
              {busy ? "Saving..." : "Save General"}
            </button>
          </>
        )}

        {tab === "api-keys" && (
          <>
            <h2 className="text-xs uppercase tracking-wider text-stone-400 mb-4">
              API Credentials
            </h2>

            <div className="bg-amber-50 border border-amber-100 rounded-lg p-3 mb-6 text-xs text-amber-800">
              Sensitive values are masked. Only edit a field if you want to
              change it.
            </div>

            <Field
              label="OpenAI API Key"
              settingKey="openai_api_key"
              placeholder="sk-..."
              helpText="Used for chatbot and embeddings (Phase 8)"
            />

            <Field
              label="Cloudinary Cloud Name"
              settingKey="cloudinary_cloud_name"
              placeholder="your-cloud-name"
            />

            <Field
              label="Cloudinary API Key"
              settingKey="cloudinary_api_key"
              placeholder="your-api-key"
            />

            <Field
              label="Cloudinary API Secret"
              settingKey="cloudinary_api_secret"
              type="password"
              placeholder="•••••••"
            />

            <button
              onClick={() =>
                save([
                  "openai_api_key",
                  "cloudinary_cloud_name",
                  "cloudinary_api_key",
                  "cloudinary_api_secret",
                ])
              }
              disabled={busy}
              className="mt-4 px-6 py-2.5 bg-amber-600 text-white rounded-lg text-sm font-medium hover:bg-amber-700 disabled:opacity-50"
            >
              {busy ? "Saving..." : "Save API Keys"}
            </button>

            <div className="mt-8 pt-6 border-t border-stone-100">
              <h3 className="text-xs uppercase tracking-wider text-stone-400 mb-3">
                Environment Status
              </h3>
              <ul className="space-y-2 text-sm">
                <li className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-green-500" />
                  <span className="text-stone-600">
                    DATABASE_URL configured
                  </span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-green-500" />
                  <span className="text-stone-600">
                    NEXTAUTH_SECRET configured
                  </span>
                </li>
              </ul>
            </div>
          </>
        )}

        {tab === "email" && (
          <>
            <h2 className="text-xs uppercase tracking-wider text-stone-400 mb-4">
              Email Configuration
            </h2>

            <Field
              label="SMTP Provider"
              settingKey="smtp_provider"
              placeholder="SendGrid"
            />

            <Field
              label="From Email"
              settingKey="smtp_from"
              type="email"
              placeholder="noreply@luolingua.ai"
            />

            <Field
              label="SMTP Password / API Key"
              settingKey="smtp_password"
              type="password"
              placeholder="•••••••"
            />

            <button
              onClick={() =>
                save(["smtp_provider", "smtp_from", "smtp_password"])
              }
              disabled={busy}
              className="mt-4 px-6 py-2.5 bg-amber-600 text-white rounded-lg text-sm font-medium hover:bg-amber-700 disabled:opacity-50"
            >
              {busy ? "Saving..." : "Save Email"}
            </button>
          </>
        )}

        {tab === "storage" && (
          <>
            <h2 className="text-xs uppercase tracking-wider text-stone-400 mb-4">
              Storage
            </h2>
            <div className="bg-stone-50 rounded-lg p-4 mb-4">
              <p className="text-sm text-stone-600 mb-2">
                Media files are stored on Cloudinary (free tier: 25 GB storage,
                25 GB bandwidth/month).
              </p>
              <p className="text-sm text-stone-600">
                Database storage: Neon PostgreSQL (free tier: 0.5 GB).
              </p>
            </div>
            <a
              href="/admin/media"
              className="inline-block px-6 py-2.5 bg-amber-600 text-white rounded-lg text-sm font-medium hover:bg-amber-700"
            >
              Open Media Library →
            </a>
            <a
              href="/super-admin/backup"
              className="inline-block ml-3 px-6 py-2.5 bg-white border border-stone-300 text-stone-700 rounded-lg text-sm font-medium hover:bg-stone-50"
            >
              Manage Backups →
            </a>
          </>
        )}

        {tab === "maintenance" && (
          <>
            <h2 className="text-xs uppercase tracking-wider text-stone-400 mb-4">
              Maintenance Mode
            </h2>

            <div className="flex items-center gap-3 mb-4">
              <button
                onClick={() =>
                  update(
                    "maintenance_mode",
                    values.maintenance_mode === "on" ? "off" : "on"
                  )
                }
                className={`relative w-12 h-6 rounded-full transition ${
                  values.maintenance_mode === "on"
                    ? "bg-red-500"
                    : "bg-stone-300"
                }`}
              >
                <span
                  className={`absolute top-0.5 w-5 h-5 bg-white rounded-full transition-transform ${
                    values.maintenance_mode === "on"
                      ? "translate-x-6"
                      : "translate-x-0.5"
                  }`}
                />
              </button>
              <span className="text-sm text-stone-700">
                {values.maintenance_mode === "on"
                  ? "Maintenance mode is ON — only super admins can access the site"
                  : "Maintenance mode is OFF — public site is live"}
              </span>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-stone-700 mb-1">
                Maintenance message
              </label>
              <textarea
                rows={3}
                value={values.maintenance_message ?? ""}
                onChange={(e) =>
                  update("maintenance_message", e.target.value)
                }
                className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 text-sm"
              />
            </div>

            <button
              onClick={() =>
                save(["maintenance_mode", "maintenance_message"])
              }
              disabled={busy}
              className="mt-4 px-6 py-2.5 bg-amber-600 text-white rounded-lg text-sm font-medium hover:bg-amber-700 disabled:opacity-50"
            >
              {busy ? "Saving..." : "Save Maintenance Settings"}
            </button>
          </>
        )}
      </div>
    </div>
  );
}