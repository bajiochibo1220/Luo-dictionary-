import { maskSettings } from "@/lib/settings-policy";
import { getSystemSettings } from "@/lib/settings";
import { prisma } from "@/lib/db";
import { SystemClient } from "./system-client";
import { DEFAULT_PRIVACY, DEFAULT_TERMS } from "@/lib/legal-content";
import { auth } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function SystemPage() {
  const [settings, languages, session] = await Promise.all([
    getSystemSettings({ fresh: true }),
    prisma.language.findMany({
      where: { isActive: true },
      orderBy: { displayOrder: "asc" },
      select: { id: true, code: true, name: true, nativeName: true },
    }),
    auth(),
  ]);

  const masked = maskSettings(settings);

  const defaults: Record<string, string> = {
    site_name: "Luo Heritage",
    nrf_namespace: "JOOUST/NRF/LuoAI_Repository",
    support_email: "",
    default_language_id: String(languages[0]?.id ?? 1),
    maintenance_mode: "off",
    maintenance_message: "We'll be back shortly...",
    ai_text_provider: "deepseek",
    deepseek_api_key: "",
    deepseek_model: "deepseek-flash",
    groq_api_key: "", groq_model: "openai/gpt-oss-20b", groq_vision_model: "qwen/qwen3.8-27b",
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
