import { getSystemSettings } from "./settings";

export async function sendSystemEmail(to: string, subject: string, text: string) {
  const settings = await getSystemSettings();
  const provider = (settings.smtp_provider || "").trim().toLowerCase();
  const from = settings.smtp_from?.trim();
  const key = settings.smtp_password?.trim();
  if (!["sendgrid", "resend"].includes(provider) || !from || !key) throw Object.assign(new Error("Configure SendGrid or Resend, a verified sender address, and an API key first."), { status: 503 });
  if (![from, to].every(address => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(address))) throw Object.assign(new Error("A valid sender and recipient email address are required."), { status: 400 });
  const url = provider === "sendgrid" ? "https://api.sendgrid.com/v3/mail/send" : "https://api.resend.com/emails";
  const payload = provider === "sendgrid"
    ? { personalizations: [{ to: [{ email: to }] }], from: { email: from }, subject, content: [{ type: "text/plain", value: text }] }
    : { from, to: [to], subject, text };
  const response = await fetch(url, { method: "POST", headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" }, body: JSON.stringify(payload), signal: AbortSignal.timeout(15_000) });
  if (!response.ok) throw Object.assign(new Error("The email provider rejected delivery. Check the API key and verified sender."), { status: 502 });
}
