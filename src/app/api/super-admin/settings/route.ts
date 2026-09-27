import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import {
  getSystemSettings,
  setSystemSettings,
} from "@/lib/settings";
import { logAction } from "@/lib/audit";

const SENSITIVE_KEYS = [
  "openai_api_key",
  "cloudinary_api_secret",
  "smtp_password",
];

function mask(value: string): string {
  if (!value) return "";
  if (value.length <= 8) return "•".repeat(value.length);
  return value.slice(0, 4) + "•".repeat(20) + value.slice(-4);
}

export async function GET() {
  const session = await auth();
  if (!session?.user || !(session.user as any).isSuperAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const settings = await getSystemSettings();

  // Mask sensitive values
  const masked: Record<string, string> = {};
  for (const [k, v] of Object.entries(settings)) {
    masked[k] = SENSITIVE_KEYS.includes(k) && v ? mask(v) : v;
  }

  return NextResponse.json({ success: true, data: masked });
}

export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session?.user || !(session.user as any).isSuperAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const updates: Record<string, string> = {};

  for (const [key, value] of Object.entries(body)) {
    if (typeof value !== "string") continue;
    // Skip masked values (user didn't change them)
    if (
      SENSITIVE_KEYS.includes(key) &&
      value.includes("•")
    ) {
      continue;
    }
    updates[key] = value;
  }

  await setSystemSettings(updates);

  await logAction({
    userId: (session.user as any).id,
    action: "settings.updated",
    entityType: "system_settings",
    newValue: { keys: Object.keys(updates) },
  });

  return NextResponse.json({ success: true });
}