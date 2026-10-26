import { InterfaceLanguageSelector } from "@/components/shared/interface-language";
import { PartnerBranding } from "@/components/shared/partner-branding";
import { BrandMark } from "./brand-mark";
import { APP_NAME } from "@/lib/brand";
import { AuthLogoBackground } from "@/components/shared/auth-logo-background";

export function AuthShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="auth-page relative isolate min-h-screen flex flex-col">
      <main className="relative flex-1 flex flex-col items-center justify-center px-4 py-6 lg:py-12 lg:px-16 overflow-hidden">
        {/* Diamond pattern */}
        <div
          className="absolute inset-0 opacity-[0.08] pointer-events-none"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M30 0l30 30-30 30L0 30z' fill='none' stroke='%234a2110' stroke-width='1'/%3E%3Ccircle cx='30' cy='30' r='6' fill='none' stroke='%234a2110' stroke-width='1'/%3E%3C/svg%3E")`,
            backgroundSize: "60px 60px",
          }}
        />

        {/* Application identity stays outside the form. */}
        <div className="relative mb-5 flex w-full max-w-md items-center gap-3 z-10">
          <BrandMark className="h-14 w-14 shadow-lg" />
          <p className="font-serif text-2xl text-stone-900">{APP_NAME}</p>
        </div>

        <div className="auth-form-surface relative z-10 w-full max-w-md rounded-3xl p-5 sm:p-7">
          <AuthLogoBackground />
          <div className="auth-form-content relative z-10">
            <div className="mb-4 flex justify-end"><InterfaceLanguageSelector /></div>
            <div className="mb-6 border-b border-stone-200 pb-4"><PartnerBranding variant="auth" /></div>
            {children}
          </div>
        </div>
      </main>


    </div>
  );
}
