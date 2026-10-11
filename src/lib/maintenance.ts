import { getSystemSettings } from "./settings";
import { auth } from "./auth";
import { hasAnyAdminRole } from "./permissions";

export async function maintenanceMessage(): Promise<string | null> {
  const settings = await getSystemSettings();
  if (settings.maintenance_mode !== "on") return null;
  const session = await auth();
  return hasAnyAdminRole(session) ? null : settings.maintenance_message || "The library is undergoing maintenance. Please try again shortly.";
}

export async function assertServiceAvailable() {
  const message = await maintenanceMessage();
  if (message) throw Object.assign(new Error(message), { status: 503 });
}
