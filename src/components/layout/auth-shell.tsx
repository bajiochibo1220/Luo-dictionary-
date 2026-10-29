import { APP_NAME } from "@/lib/brand";
import { AuthLogoBackground } from "@/components/shared/auth-logo-background";
import { BrandMark } from "@/components/shared/brand-mark";
import { InterfaceText } from "@/components/shared/interface-language";
import { BookOpen } from "lucide-react";
import Link from "next/link";

export function AuthShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="auth-page relative isolate min-h-screen flex flex-col">
      <main className="auth-layout relative flex-1 px-4 py-6 lg:py-12 lg:px-16">
        {/* Diamond pattern */}
        <div
          className="absolute inset-0 opacity-[0.08] pointer-events-none"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M30 0l30 30-30 30L0 30z' fill='none' stroke='%234a2110' stroke-width='1'/%3E%3Ccircle cx='30' cy='30' r='6' fill='none' stroke='%234a2110' stroke-width='1'/%3E%3C/svg%3E")`,
            backgroundSize: "60px 60px",
          }}
        />

        {/* Application identity stays outside the form. */}
        <div className="auth-introduction relative z-10"><Link href="/application" className="auth-brand"><BrandMark /><span className="font-serif text-2xl">{APP_NAME}</span></Link>
          <AuthLogoBackground />
          <div className="auth-story"><span className="hero-eyebrow"><BookOpen size={16} aria-hidden="true" /><InterfaceText source="Language. Culture. Connection." /></span><h2 className="font-serif"><InterfaceText source="Your roots. A world of discovery." /></h2><p><InterfaceText source="Keep language and living knowledge close. Learn something new, revisit a familiar story, and carry it forward." /></p>
          </div>
        </div>

        <div className="auth-form-surface relative z-10 w-full max-w-md rounded-3xl p-5 sm:p-7">
          <div className="auth-form-content relative z-10">
            {children}
          </div>
        </div>
      </main>


    </div>
  );
}
