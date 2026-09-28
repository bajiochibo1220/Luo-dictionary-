import { getSystemSettings } from "@/lib/settings";
import { prisma } from "@/lib/db";
import { SystemClient } from "./system-client";

export const dynamic = "force-dynamic";

export default async function SystemPage() {
  const [settings, languages] = await Promise.all([
    getSystemSettings(),
    prisma.language.findMany({
      where: { isActive: true },
      orderBy: { displayOrder: "asc" },
      select: { id: true, code: true, name: true, nativeName: true },
    }),
  ]);

  const sensitive = [
    "openai_api_key",
    "cloudinary_api_secret",
    "smtp_password",
  ];

  const masked: Record<string, string> = {};
  for (const [k, v] of Object.entries(settings)) {
    if (sensitive.includes(k) && v) {
      masked[k] =
        v.length <= 8
          ? "•".repeat(v.length)
          : v.slice(0, 4) + "•".repeat(20) + v.slice(-4);
    } else {
      masked[k] = v;
    }
  }

  const defaults: Record<string, string> = {
    site_name: "LuoLinguaAI",
    nrf_namespace: "JOOUST/NRF/LuoAI_Repository",
    support_email: "",
    default_language_id: String(languages[0]?.id ?? 1),
    maintenance_mode: "off",
    maintenance_message: "We'll be back shortly...",
    openai_api_key: "",
    cloudinary_cloud_name: "",
    cloudinary_api_key: "",
    cloudinary_api_secret: "",
    smtp_provider: "SendGrid",
    smtp_from: "",
    smtp_password: "",
  };

  const merged = { ...defaults, ...masked };

  return <SystemClient settings={merged} languages={languages} />;
}