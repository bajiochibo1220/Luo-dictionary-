import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function SuperAdminDashboardPage() {
  const session = await auth();
  if (!session) redirect("/login");
  if (!(session.user as any).isSuperAdmin) redirect("/");

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-3xl font-serif mb-4 text-stone-800">
        Super Admin Dashboard
      </h1>
      <p className="text-stone-600">
        You have full platform access. This panel will contain:
      </p>
      <ul className="list-disc ml-6 mt-4 text-stone-600">
        <li>Language management (add/remove languages)</li>
        <li>Admin management</li>
        <li>System settings</li>
        <li>Backup & restore</li>
        <li>API keys</li>
      </ul>
    </div>
  );
}