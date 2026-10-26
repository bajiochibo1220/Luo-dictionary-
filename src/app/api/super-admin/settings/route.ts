import { NextRequest, NextResponse } from "next/server";
import { EDITABLE_SETTINGS, isSecretSetting, maskSettings } from "@/lib/settings-policy";
import { auth } from "@/lib/auth";
import {
  getSystemSettings,
  setSystemSettings,
} from "@/lib/settings";
import { logAction } from "@/lib/audit";

export async function GET() {
  const session = await auth();
  if (!session?.user || (!(session.user as any).isSuperAdmin && !(session.user as any).isMasterSuperAdmin)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const settings = await getSystemSettings();

  return NextResponse.json({ success: true, data: maskSettings(settings) });
}

export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session?.user || (!(session.user as any).isSuperAdmin && !(session.user as any).isMasterSuperAdmin)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  if (!body || typeof body !== "object" || Array.isArray(body)) return NextResponse.json({ error: "Invalid settings" }, { status: 400 });
  const updates: Record<string, string> = {};

  for (const [key, value] of Object.entries(body)) {
    if (!EDITABLE_SETTINGS.has(key) || typeof value !== "string" || value.length > 50_000) return NextResponse.json({ error: "Invalid setting" }, { status: 400 });
    if ((key === "terms_content" || key === "privacy_content") && !(session.user as any).isMasterSuperAdmin) {
      return NextResponse.json({ error: "Only the master super admin can edit legal documents" }, { status: 403 });
    }
    if ((key === "terms_content" || key === "privacy_content") && value.length > 50_000) {
      return NextResponse.json({ error: "Legal documents must be under 50,000 characters" }, { status: 400 });
    }
    if (["jooust_color", "nrf_color"].includes(key) && !/^#[0-9a-f]{6}$/i.test(value)) return NextResponse.json({ error: "Choose a valid six-digit colour." }, { status: 400 });
    // Skip masked values (user didn't change them)
    if (
      isSecretSetting(key) &&
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
