"use client";

const TABS = [
  { key: "general", label: "General" },
  { key: "api-keys", label: "API Keys" },
  { key: "email", label: "Email" },
  { key: "storage", label: "Storage" },
  { key: "maintenance", label: "Maintenance" },
  { key: "legal", label: "Terms & Privacy" },
];

export function SettingsTabs({
  active,
  onChange,
  isMasterSuperAdmin,
}: {
  active: string;
  onChange: (key: string) => void;
  isMasterSuperAdmin: boolean;
}) {
  return (
    <div className="mb-6 border-b border-stone-200">
      <div className="flex gap-4 overflow-x-auto">
        {TABS.filter((t) => t.key !== "legal" || isMasterSuperAdmin).map((t) => (
          <button
            key={t.key}
            onClick={() => onChange(t.key)}
            className={`pb-3 text-sm uppercase tracking-wider transition whitespace-nowrap ${
              active === t.key
                ? "text-amber-600 border-b-2 border-amber-600 font-medium"
                : "text-stone-500 hover:text-stone-700"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>
    </div>
  );
}
