"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

type Module = { id: number; code: string; baseName: string };

export function LanguageWizard({ modules }: { modules: Module[] }) {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [busy, setBusy] = useState(false);

  // Form state
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [nativeName, setNativeName] = useState("");
  const [flagIcon, setFlagIcon] = useState("");
  const [displayOrder, setDisplayOrder] = useState(99);
  const [adminEmail, setAdminEmail] = useState("");

  async function submit() {
    setBusy(true);
    try {
      const res = await fetch("/api/languages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code,
          name,
          nativeName,
          flagIcon: flagIcon || null,
          displayOrder,
          adminEmail: adminEmail || null,
        }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || "Failed");

      toast.success("Language created with all modules cloned");
      router.push(`/super-admin/languages/${json.data.id}`);
      router.refresh();
    } catch (e: any) {
      toast.error(e.message || "Failed to create language");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-stone-100 p-8 max-w-2xl mx-auto">
      {/* Step indicator */}
      <div className="flex items-center justify-between mb-8">
        {[1, 2, 3, 4].map((s) => (
          <div key={s} className="flex items-center">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition ${
                s <= step
                  ? "bg-amber-600 text-white"
                  : "bg-stone-100 text-stone-400"
              }`}
            >
              {s}
            </div>
            {s < 4 && (
              <div
                className={`w-16 h-0.5 mx-2 ${
                  s < step ? "bg-amber-600" : "bg-stone-200"
                }`}
              />
            )}
          </div>
        ))}
      </div>

      {/* Step 1 — Basic Info */}
      {step === 1 && (
        <div className="space-y-4">
          <h2 className="text-xl font-serif text-stone-800 mb-4">
            Basic Information
          </h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1">
                Language code <span className="text-red-500">*</span>
              </label>
              <input
                value={code}
                onChange={(e) => setCode(e.target.value.toLowerCase())}
                placeholder="e.g. kik"
                className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1">
                Display order
              </label>
              <input
                type="number"
                value={displayOrder}
                onChange={(e) => setDisplayOrder(Number(e.target.value))}
                className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1">
              English name <span className="text-red-500">*</span>
            </label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Kikuyu"
              className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1">
              Native name <span className="text-red-500">*</span>
            </label>
            <input
              value={nativeName}
              onChange={(e) => setNativeName(e.target.value)}
              placeholder="e.g. Gĩkũyũ"
              className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1">
              Flag icon (emoji, optional)
            </label>
            <input
              value={flagIcon}
              onChange={(e) => setFlagIcon(e.target.value)}
              placeholder="🌍"
              maxLength={4}
              className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>
        </div>
      )}

      {/* Step 2 — Admin */}
      {step === 2 && (
        <div className="space-y-4">
          <h2 className="text-xl font-serif text-stone-800 mb-4">
            Language Admin
          </h2>
          <p className="text-sm text-stone-500 mb-4">
            Optionally assign an admin who will manage this language. They must
            already have a LuoLinguaAI account.
          </p>
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1">
              Admin email (optional)
            </label>
            <input
              type="email"
              value={adminEmail}
              onChange={(e) => setAdminEmail(e.target.value)}
              placeholder="admin@example.com"
              className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>
        </div>
      )}

      {/* Step 3 — Module titles */}
      {step === 3 && (
        <div className="space-y-4">
          <h2 className="text-xl font-serif text-stone-800 mb-4">
            Module Titles
          </h2>
          <p className="text-sm text-stone-500 mb-4">
            All {modules.length} modules will be cloned with English defaults.
            The language admin can rename them later.
          </p>
          <div className="bg-stone-50 rounded-lg p-4 max-h-64 overflow-y-auto">
            <ul className="space-y-1 text-sm">
              {modules.map((m) => (
                <li
                  key={m.id}
                  className="flex items-center justify-between py-1"
                >
                  <span className="text-stone-600">{m.baseName}</span>
                  <span className="text-xs text-stone-400">
                    → {m.baseName}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* Step 4 — Confirm */}
      {step === 4 && (
        <div className="space-y-4">
          <h2 className="text-xl font-serif text-stone-800 mb-4">
            Confirm & Create
          </h2>
          <div className="bg-stone-50 rounded-lg p-4 space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-stone-500">Code</span>
              <span className="text-stone-800 font-medium">{code}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-stone-500">Name</span>
              <span className="text-stone-800 font-medium">{name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-stone-500">Native name</span>
              <span className="text-stone-800 font-medium">{nativeName}</span>
            </div>
            {adminEmail && (
              <div className="flex justify-between">
                <span className="text-stone-500">Admin</span>
                <span className="text-stone-800 font-medium">
                  {adminEmail}
                </span>
              </div>
            )}
            <div className="pt-2 border-t border-stone-200 mt-2">
              <p className="text-xs text-stone-500 mb-1">Will create:</p>
              <p className="text-xs text-stone-600">
                • 1 language record
                <br />• {modules.length} module translations
                <br />• All field translations
                <br />• 2 default settings
                <br />• Language admin role (if provided)
              </p>
            </div>
            <p className="text-xs text-amber-600 pt-2 border-t border-stone-200 mt-2">
              Status: <strong>Inactive</strong> — you can activate it after
              setup.
            </p>
          </div>
        </div>
      )}

      {/* Navigation */}
      <div className="flex justify-between mt-8 pt-6 border-t border-stone-100">
        <button
          onClick={() => setStep(Math.max(1, step - 1))}
          disabled={step === 1}
          className="px-4 py-2 bg-white border border-stone-300 text-stone-700 rounded-lg text-sm font-medium hover:bg-stone-50 disabled:opacity-50"
        >
          Back
        </button>

        {step < 4 ? (
          <button
            onClick={() => setStep(step + 1)}
            disabled={
              (step === 1 && (!code || !name || !nativeName)) ||
              (step === 3 && modules.length === 0)
            }
            className="px-6 py-2 bg-amber-600 text-white rounded-lg text-sm font-medium hover:bg-amber-700 disabled:opacity-50"
          >
            Next
          </button>
        ) : (
          <button
            onClick={submit}
            disabled={busy}
            className="px-6 py-2 bg-amber-600 text-white rounded-lg text-sm font-medium hover:bg-amber-700 disabled:opacity-50"
          >
            {busy ? "Creating..." : "Create Language"}
          </button>
        )}
      </div>
    </div>
  );
}