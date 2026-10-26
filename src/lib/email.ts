import { getSystemSettings } from "./settings";

export async function getEmailConfiguration() {
  const settings = await getSystemSettings();
  const provider = (process.env.EMAIL_PROVIDER || settings.smtp_provider || "resend").trim().toLowerCase();
  const from = (process.env.EMAIL_FROM || settings.smtp_from)?.trim();
  const key = (process.env.EMAIL_API_KEY || settings.smtp_password)?.trim();
  if (!["sendgrid", "resend"].includes(provider) || !from || !key) throw Object.assign(new Error("Configure SendGrid or Resend, a verified sender address, and an API key first."), { status: 503 });
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(from)) throw Object.assign(new Error("Configure a valid verified sender address."), { status: 503 });
  return { provider, from, key };
}

export async function sendSystemEmail(to: string, subject: string, text: string) {
  const { provider, from, key } = await getEmailConfiguration();
  if (![from, to].every(address => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(address))) throw Object.assign(new Error("A valid sender and recipient email address are required."), { status: 400 });
  const url = provider === "sendgrid" ? "https://api.sendgrid.com/v3/mail/send" : "https://api.resend.com/emails";
  const payload = provider === "sendgrid"
    ? { personalizations: [{ to: [{ email: to }] }], from: { email: from }, subject, content: [{ type: "text/plain", value: text }] }
    : { from, to: [to], subject, text };
  const response = await fetch(url, { method: "POST", headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" }, body: JSON.stringify(payload), signal: AbortSignal.timeout(15_000) });
  if (!response.ok) throw Object.assign(new Error("The email provider rejected delivery. Check the API key and verified sender."), { status: 502 });
}
