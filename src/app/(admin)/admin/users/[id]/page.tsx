import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { UserDetailPanel } from "@/components/admin/user-detail-panel";
import { auth } from "@/lib/auth";

export default async function UserDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const session = await auth();
  const isMasterSuperAdmin = session?.user?.isMasterSuperAdmin === true;
  const user = await prisma.user.findUnique({
    where: { id: params.id },
    select: {
      id: true,
      email: true,
      name: true,
      isSuperAdmin: true,
      isMasterSuperAdmin: true,
      status: true,
      createdAt: true,
      languageRoles: {
        include: { language: true },
        orderBy: { assignedAt: "asc" },
      },
    },
  });

  if (!user) notFound();

  const languages = await prisma.language.findMany({
      where: { isActive: true, ...(isMasterSuperAdmin ? {} : { id: { in: (session?.user?.languageRoles ?? []).map((role) => role.languageId) } }) },
    orderBy: { displayOrder: "asc" },
    select: { id: true, code: true, nativeName: true },
  });

  const contributionCount = await prisma.culturalRecord.count({
    where: { contributorId: user.id },
  });

  return (
    <div className="max-w-4xl mx-auto">
      <Link
        href="/admin/users"
        className="inline-flex items-center text-sm text-stone-500 hover:text-amber-600 mb-6"
      >
        ← Back to users
      </Link>

      <header className="mb-8">
        <h1 className="text-3xl font-serif text-stone-800 mb-1">
          {user.name || user.email}
        </h1>
        <p className="text-sm text-stone-500">{user.email}</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="bg-white rounded-xl shadow-sm border border-stone-100 p-5">
          <p className="text-xs uppercase tracking-wider text-stone-400 mb-1">
            Contributions
          </p>
          <p className="text-2xl font-serif text-stone-800">
            {contributionCount}
          </p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-stone-100 p-5">
          <p className="text-xs uppercase tracking-wider text-stone-400 mb-1">
            Language Roles
          </p>
          <p className="text-2xl font-serif text-stone-800">
            {user.languageRoles.length}
          </p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-stone-100 p-5">
          <p className="text-xs uppercase tracking-wider text-stone-400 mb-1">
            Joined
          </p>
          <p className="text-sm text-stone-700">
            {new Date(user.createdAt).toLocaleDateString("en-KE", {
              dateStyle: "medium",
            })}
          </p>
        </div>
      </div>

      <UserDetailPanel
        user={{
          id: user.id,
          email: user.email,
          name: user.name,
          isSuperAdmin: user.isSuperAdmin,
          isMasterSuperAdmin: user.isMasterSuperAdmin,
          status: user.status,
          languageRoles: user.languageRoles.map((r) => ({
            id: r.id,
            role: r.role,
            languageId: r.languageId,
            languageName: r.language.nativeName,
          })),
        }}
        languages={languages}
        isMasterSuperAdmin={isMasterSuperAdmin}
      />
    </div>
  );
}
