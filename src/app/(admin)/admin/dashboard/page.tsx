import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function AdminDashboardPage() {
  const session = await auth();
  if (!session) redirect("/login");

  const user = session.user as any;

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-3xl font-serif mb-4 text-stone-800">
        Admin Dashboard
      </h1>
      <p className="text-stone-600 mb-6">
        Protected route - you are logged in with admin access.
      </p>
      <pre className="bg-stone-100 p-4 rounded-lg text-sm overflow-auto">
        {JSON.stringify(
          {
            email: user.email,
            isSuperAdmin: user.isSuperAdmin,
            languageRoles: user.languageRoles,
          },
          null,
          2
        )}
      </pre>
    </div>
  );
}