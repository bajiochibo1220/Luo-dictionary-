import { Suspense } from "react";
import Link from "next/link";
import { AdminLoginForm } from "@/components/forms/admin-login-form";

export const dynamic = "force-dynamic";

export default function AdminLoginPage() {
  return (
    <div className="min-h-screen flex flex-col lg:flex-row">
      <main className="relative flex-1 flex items-center justify-center px-6 py-12 lg:px-16 bg-[#cfc09a] overflow-hidden">
        <div
          className="absolute inset-0 opacity-[0.08] pointer-events-none"
          style={{
            backgroundImage:
              "url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M30 0l30 30-30 30L0 30z' fill='none' stroke='%234a2110' stroke-width='1'/%3E%3Ccircle cx='30' cy='30' r='6' fill='none' stroke='%234a2110' stroke-width='1'/%3E%3C/svg%3E\")",
            backgroundSize: "60px 60px",
          }}
        />

        <div className="absolute top-1/4 -left-20 w-[400px] h-[400px] rounded-full bg-amber-200/50 blur-3xl pointer-events-none" />
        <div className="absolute bottom-1/4 -right-20 w-[300px] h-[300px] rounded-full bg-orange-200/40 blur-3xl pointer-events-none" />

        <div className="relative w-full max-w-md">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-700 to-amber-900 flex items-center justify-center shadow-lg shadow-amber-900/30 ring-1 ring-amber-500/30">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="w-6 h-6 text-amber-50"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              </svg>
            </div>
            <div>
              <h1 className="font-serif text-2xl text-stone-900 leading-tight">
                Super Admin Portal
              </h1>
              <p className="text-[10px] uppercase tracking-[0.3em] text-stone-800/60 font-semibold">
                Owner Access Only
              </p>
            </div>
          </div>

          <p className="text-sm text-stone-800/70 mb-5 leading-relaxed">
            This portal is for the platform <strong>owner (super admin)</strong>{" "}
            only. Other administrators and public users should use the{" "}
            <Link
              href="/"
              className="text-amber-900 hover:text-amber-800 underline font-medium"
            >
              public login page
            </Link>
            .
          </p>

          <div className="bg-white rounded-2xl shadow-xl shadow-stone-900/10 border border-stone-200 p-6">
            <Suspense
              fallback={
                <div className="text-center py-8 text-stone-400 text-sm">
                  Loading...
                </div>
              }
            >
              <AdminLoginForm />
            </Suspense>
          </div>

          <p className="text-center mt-6 text-xs text-stone-800/50">
            JOOUST · NRF · LuoLinguaAI Ownership
          </p>
        </div>
      </main>

      <aside className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-gradient-to-br from-[#3d1a0a] via-[#6b3416] to-[#8f4e1f] text-white">
        <div
          className="absolute inset-0 opacity-[0.06] pointer-events-none"
          style={{
            backgroundImage:
              "url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M30 0l30 30-30 30L0 30z' fill='none' stroke='white' stroke-width='1'/%3E%3Ccircle cx='30' cy='30' r='6' fill='none' stroke='white' stroke-width='1'/%3E%3C/svg%3E\")",
            backgroundSize: "60px 60px",
          }}
        />

        <div className="absolute -top-40 -right-40 w-[500px] h-[500px] rounded-full bg-amber-400/25 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-[500px] h-[500px] rounded-full bg-orange-300/20 blur-3xl" />

        <div className="relative z-10 flex flex-col justify-center p-16 w-full">
          <div className="max-w-md">
            <div className="flex items-center gap-2 mb-8">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
              <span className="text-xs uppercase tracking-[0.3em] text-amber-200/70">
                Ownership Session
              </span>
            </div>

            <h2 className="font-serif text-4xl lg:text-5xl leading-tight text-amber-50 mb-6">
              You hold the keys
              <br />
              <span className="italic text-amber-300">to the platform.</span>
            </h2>

            <ul className="space-y-4 text-sm text-amber-100/70">
              <Bullet text="Create and manage all other administrators" />
              <Bullet text="Add, activate, or deactivate languages" />
              <Bullet text="Full control over every module and every record" />
              <Bullet text="Every action logged and permanently tracked" />
            </ul>

            <div className="mt-12 pt-8 border-t border-amber-100/15">
              <p className="text-xs text-amber-100/40 leading-relaxed italic">
                &ldquo;A super admin is a steward. Build systems that outlive
                you, and give others the tools to keep them alive.&rdquo;
              </p>
            </div>
          </div>
        </div>
      </aside>
    </div>
  );
}

function Bullet({ text }: { text: string }) {
  return (
    <li className="flex items-start gap-3">
      <span className="w-1.5 h-1.5 rounded-full bg-amber-400 mt-2 flex-shrink-0" />
      <span className="leading-relaxed">{text}</span>
    </li>
  );
}