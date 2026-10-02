import Link from "next/link";
import { prisma } from "@/lib/db";
import { UserTable } from "@/components/admin/user-table";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function UsersPage({
  searchParams,
}: {
  searchParams: { status?: string; role?: string };
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (!session.user.isSuperAdmin && !session.user.isMasterSuperAdmin && !(session.user.languageRoles ?? []).some((role: any) => role.role === "language_admin")) redirect("/admin/dashboard");
  const where: any = {};
  if (searchParams.status) where.status = searchParams.status;
  if (searchParams.role) {
    where.languageRoles = { some: { role: searchParams.role } };
  }

  const users = await prisma.user.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: 100,
    select: {
      id: true,
      email: true,
      name: true,
      isSuperAdmin: true,
      status: true,
      createdAt: true,
      languageRoles: {
        select: {
          id: true,
          role: true,
          language: { select: { code: true, nativeName: true } },
        },
      },
    },
  });

  const formatted = users.map((u) => ({
    ...u,
    createdAt: u.createdAt.toISOString(),
  }));

  return (
    <div>
      <header className="mb-6">
        <h1 className="text-3xl font-serif text-stone-800 mb-1">Users</h1>
        <p className="text-sm text-stone-500">
          {formatted.length} {formatted.length === 1 ? "user" : "users"}
        </p>
      </header>

      <div className="mb-4 flex flex-wrap gap-2">
        <Link
          href="/admin/users"
          className={`text-xs px-3 py-1.5 rounded-full ${
            !searchParams.status && !searchParams.role
              ? "bg-amber-600 text-white"
              : "bg-white border border-stone-200 text-stone-600 hover:border-amber-400"
          }`}
        >
          All
        </Link>
        {["active", "suspended", "pending"].map((s) => (
          <Link
            key={s}
            href={`/admin/users?status=${s}`}
            className={`text-xs px-3 py-1.5 rounded-full capitalize ${
              searchParams.status === s
                ? "bg-amber-600 text-white"
                : "bg-white border border-stone-200 text-stone-600 hover:border-amber-400"
            }`}
          >
            {s}
          </Link>
        ))}
        {["language_admin", "uploader", "publisher", "content_editor", "cultural_expert"].map((r) => (
          <Link
            key={r}
            href={`/admin/users?role=${r}`}
            className={`text-xs px-3 py-1.5 rounded-full ${
              searchParams.role === r
                ? "bg-amber-600 text-white"
                : "bg-white border border-stone-200 text-stone-600 hover:border-amber-400"
            }`}
          >
            {r.replace("_", " ")}
          </Link>
        ))}
      </div>

      <UserTable users={formatted} canBulkManage={!!((session?.user as any)?.isSuperAdmin || (session?.user as any)?.isMasterSuperAdmin)} />
    </div>
  );
}
