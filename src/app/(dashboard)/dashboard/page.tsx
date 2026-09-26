import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function UserDashboardPage() {
  const session = await auth();
  if (!session) redirect("/login");

  const user = session.user as any;

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-3xl font-serif mb-4 text-stone-800">
        Your Dashboard
      </h1>
      <p className="text-stone-600 mb-6">
        Welcome, {user.name || user.email}
      </p>
      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-lg font-medium mb-2">Your roles</h2>
        <ul className="text-sm text-stone-600">
          {(user.languageRoles ?? []).map((lr: any, i: number) => (
            <li key={i}>
              {lr.languageName} - {lr.role}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}