import { redirect } from "next/navigation";
import Link from "next/link";
import { Suspense } from "react";
import { prisma } from "@/lib/db";
import { AdminRegisterForm } from "@/components/forms/admin-register-form";

export const dynamic = "force-dynamic";

export default async function AdminRegisterPage() {
  const existingSuperAdmin = await prisma.user.findFirst({
    where: { isSuperAdmin: true },
    select: { id: true },
  });

  if (existingSuperAdmin) {
    redirect("/admin-login");
  }

  return (
    <div className="min-h-screen bg-[#cfc09a] flex items-center justify-center px-6 py-12 relative overflow-hidden">
      <div
        className="absolute inset-0 opacity-[0.08] pointer-events-none"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M30 0l30 30-30 30L0 30z' fill='none' stroke='%234a2110' stroke-width='1'/%3E%3C/svg%3E")`,
          backgroundSize: "60px 60px",
        }}
      />
      <div className="absolute top-1/3 -right-40 w-[500px] h-[500px] rounded-full bg-amber-200/50 blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -left-40 w-[400px] h-[400px] rounded-full bg-orange-200/40 blur-3xl pointer-events-none" />

      <div className="relative w-full max-w-lg">
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-700 to-amber-900 flex items-center justify-center mx-auto mb-4 shadow-lg shadow-amber-900/30 ring-1 ring-amber-500/30">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="w-8 h-8 text-amber-50"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              <path d="m9 12 2 2 4-4" />
            </svg>
          </div>
          <h1 className="font-serif text-3xl text-stone-900 mb-2">
            First-Time Setup
          </h1>
          <p className="text-sm text-stone-800/70 max-w-md mx-auto leading-relaxed">
            Create the <strong className="text-amber-900">super admin</strong>{" "}
            account. This page works only once. After this, all admin accounts
            must be created from inside the dashboard.
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow-xl shadow-stone-900/10 border border-stone-200 p-6">
          <Suspense
            fallback={
              <div className="text-center py-8 text-stone-400 text-sm">
                Loading...
              </div>
            }
          >
            <AdminRegisterForm />
          </Suspense>
        </div>

        <div className="flex items-center justify-center gap-3 mt-6 text-xs">
          <Link
            href="/admin-login"
            className="text-stone-800/60 hover:text-amber-900 transition"
          >
            ← Back to admin login
          </Link>
        </div>
      </div>
    </div>
  );
}