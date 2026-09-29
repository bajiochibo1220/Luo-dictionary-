import { getSystemSettings } from "@/lib/settings";
import { prisma } from "@/lib/db";
import { SystemClient } from "./system-client";
import { DEFAULT_PRIVACY, DEFAULT_TERMS } from "@/lib/legal-content";
import { auth } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function SystemPage() {
  const [settings, languages, session] = await Promise.all([
    getSystemSettings(),
    prisma.language.findMany({
      where: { isActive: true },
      orderBy: { displayOrder: "asc" },
      select: { id: true, code: true, name: true, nativeName: true },
    }),
    auth(),
  ]);

  const sensitive = [
    "gemini_api_key",
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
    gemini_api_key: "",
    cloudinary_cloud_name: "",
    cloudinary_api_key: "",
    cloudinary_api_secret: "",
    smtp_provider: "SendGrid",
    smtp_from: "",
    smtp_password: "",
    terms_content: DEFAULT_TERMS,
    privacy_content: DEFAULT_PRIVACY,
  };

  const merged = { ...defaults, ...masked };

  return <SystemClient settings={merged} languages={languages} isMasterSuperAdmin={!!(session?.user as any)?.isMasterSuperAdmin} />;
}
