export const EDITABLE_SETTINGS = new Set(["jooust_color", "nrf_color", "site_name", "support_email", "nrf_namespace", "default_language_id", "maintenance_mode", "maintenance_message", "gemini_api_key", "gemini_model", "gemini_image_model", "gemini_fallback_model", "cloudinary_cloud_name", "cloudinary_api_key", "cloudinary_api_secret", "smtp_provider", "smtp_from", "smtp_password", "terms_content", "privacy_content"]);
export function isSecretSetting(key: string) { return /(?:secret|password|api_key|access_token|private_key|credential)/i.test(key); }
export function maskSettings(settings: Record<string, string>): Record<string, string> {
  return Object.fromEntries(Object.entries(settings).filter(([key]) => EDITABLE_SETTINGS.has(key)).map(([key, value]) => [key, isSecretSetting(key) && value ? "••••••••" : value]));
}
