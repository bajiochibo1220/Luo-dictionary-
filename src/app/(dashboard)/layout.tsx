import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { UserMenu } from "@/components/layout/user-menu";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const user = session.user as any;

  return (
    <div className="min-h-screen bg-stone-50">
      <header className="bg-white border-b border-stone-200 sticky top-0 z-30">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <span className="text-xl font-serif text-stone-800">
              LuoLinguaAI
            </span>
          </Link>

          <nav className="hidden md:flex items-center gap-6">
            <Link
              href="/dashboard"
              className="text-sm text-stone-600 hover:text-amber-600"
            >
              Dashboard
            </Link>
            <Link
              href="/my-submissions"
              className="text-sm text-stone-600 hover:text-amber-600"
            >
              My Submissions
            </Link>
          </nav>

          <UserMenu
            userEmail={user.email ?? ""}
            userName={user.name ?? null}
            isSuperAdmin={!!user.isSuperAdmin}
          />
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">{children}</main>
    </div>
  );
}