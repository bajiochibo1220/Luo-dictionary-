"use client";

import { useState } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

type Language = { id: number; code: string; nativeName: string };

const ROLES = [
  { value: "super_admin", label: "Super Admin" },
  { value: "language_admin", label: "Language Admin" },
  { value: "uploader", label: "Uploader" },
  { value: "content_editor", label: "Content Editor" },
  { value: "cultural_expert", label: "Cultural Expert" },
  { value: "publisher", label: "Publisher" },
];

export function AddAdminModal({
  languages,
  isMasterSuperAdmin,
  onClose,
}: {
  languages: Language[];
  isMasterSuperAdmin: boolean;
  onClose: () => void;
}) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [role, setRole] = useState("language_admin");
  const [languageId, setLanguageId] = useState(languages[0]?.id ?? 0);
  const [languageIds, setLanguageIds] = useState<number[]>([]);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();

    if (!email || !password) {
      toast.error("Email and password are required");
      return;
    }
    if (password.length < 8) {
      toast.error("Password must be at least 8 characters");
      return;
    }

    setBusy(true);
    try {
      const res = await fetch("/api/super-admin/admins", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          name,
          password,
          role,
          languageId,
          languageIds,
        }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || "Failed");

      toast.success("Admin created");
      onClose();
      router.refresh();
    } catch (err: any) {
      toast.error(err.message || "Failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="p-6 border-b border-stone-100 flex items-center justify-between">
          <h2 className="text-lg font-serif text-stone-800">Add Administrator</h2>
          <button
            onClick={onClose}
            className="text-stone-400 hover:text-stone-700 text-2xl"
          >
            ×
          </button>
        </div>

        <form onSubmit={submit} className="p-6 space-y-4">
          <div>
            <label className="block text-xs uppercase tracking-wider text-stone-500 mb-1">
              Email *
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2.5 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 text-sm"
            />
          </div>

          <div>
            <label className="block text-xs uppercase tracking-wider text-stone-500 mb-1">
              Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2.5 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 text-sm"
            />
          </div>

          <div>
            <label className="block text-xs uppercase tracking-wider text-stone-500 mb-1">
              Password * (min 8 characters)
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3 py-2.5 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 text-sm pr-14"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-stone-500 hover:text-amber-700"
              >
                {showPassword ? "Hide" : "Show"}
              </button>
            </div>
            <p className="text-xs text-stone-400 mt-1">
              Share this with them directly. They can change it later.
            </p>
          </div>

          <div>
            <label className="block text-xs uppercase tracking-wider text-stone-500 mb-1">
              Role *
            </label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="w-full px-3 py-2.5 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 text-sm"
            >
              {ROLES.filter((r) => r.value !== "super_admin" || isMasterSuperAdmin).map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </select>
          </div>

          {role === "super_admin" ? <div>
            <label className="block text-xs uppercase tracking-wider text-stone-500 mb-2">Languages this Super Admin oversees *</label>
            <div className="max-h-40 overflow-y-auto rounded-lg border border-stone-300 p-3 space-y-2">
              {languages.map((language) => <label key={language.id} className="flex items-center gap-2 text-sm text-stone-700">
                <input type="checkbox" checked={languageIds.includes(language.id)} onChange={(event) => setLanguageIds((current) => event.target.checked ? [...current, language.id] : current.filter((id) => id !== language.id))} />
                {language.nativeName} ({language.code})
              </label>)}
            </div>
          </div> : <div>
            <label className="block text-xs uppercase tracking-wider text-stone-500 mb-1">
              Language *
            </label>
            <select
              value={languageId}
              onChange={(e) => setLanguageId(Number(e.target.value))}
              className="w-full px-3 py-2.5 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 text-sm"
            >
              {languages.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.nativeName} ({l.code})
                </option>
              ))}
            </select>
          </div>}

          <div className="flex gap-3 pt-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 bg-white border border-stone-300 text-stone-700 rounded-lg text-sm font-medium hover:bg-stone-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={busy}
              className="flex-1 py-2.5 bg-amber-600 text-white rounded-lg text-sm font-medium hover:bg-amber-700 disabled:opacity-50"
            >
              {busy ? "Creating..." : "Create Admin"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
