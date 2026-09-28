"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";

type ModuleItem = {
  code: string;
  title: string;
  baseName: string;
};

export function AppSidebar({ modules }: { modules: ModuleItem[] }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const activeModule = searchParams.get("module");

  const items = [
    { code: "", title: "Overview", baseName: "Dashboard" },
    ...modules,
  ];

  return (
    <div className="flex flex-col h-full">
      {/* Small brand caption at top */}
      <div className="px-5 pt-5 pb-3 border-b border-amber-100/15">
        <p className="text-[10px] uppercase tracking-[0.3em] text-amber-200/70 font-medium">
          Modules
        </p>
      </div>

      {/* Module list — this is the only scrollable area */}
      <nav className="flex-1 overflow-y-auto py-2">
        {items.map((item) => {
          const isActive =
            (item.code === "" && !activeModule) ||
            (item.code !== "" && activeModule === item.code);
          const href = item.code ? `${pathname}?module=${item.code}` : pathname;

          return (
            <Link
              key={item.code || "overview"}
              href={href}
              className={`flex items-center gap-3 px-5 py-3 transition-all relative border-l-4 ${
                isActive
                  ? "bg-black/25 border-amber-400"
                  : "border-transparent hover:bg-black/15"
              }`}
            >
              <div className="min-w-0 flex-1">
                <p
                  className={`font-serif truncate leading-tight ${
                    isActive
                      ? "text-amber-100 text-[17px] font-semibold"
                      : "text-amber-50/90 text-[16px]"
                  }`}
                >
                  {item.title}
                </p>
                <p
                  className={`text-[10px] uppercase tracking-[0.15em] truncate mt-0.5 ${
                    isActive ? "text-amber-300/90" : "text-amber-100/50"
                  }`}
                >
                  {item.baseName}
                </p>
              </div>
              {isActive && (
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.8)]" />
              )}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="p-3 border-t border-amber-100/15 text-[10px] tracking-widest text-amber-100/40 text-center">
        JOOUST · NRF
      </div>
    </div>
  );
}