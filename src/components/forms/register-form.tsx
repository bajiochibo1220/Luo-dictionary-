"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { toast } from "sonner";

type Language = { id: number; code: string; name: string; nativeName: string };

export function RegisterForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [languages, setLanguages] = useState<Language[]>([]);

  useEffect(() => {
    fetch("/api/languages")
      .then((r) => r.json())
      .then((data) => setLanguages(data.data || []))
      .catch(() => {});
  }, []);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const body = {
      name: formData.get("name") as string,
      email: formData.get("email") as string,
      password: formData.get("password") as string,
      role: formData.get("role") as string,
      languageId: Number(formData.get("languageId")),
    };

    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    const data = await res.json();
    setLoading(false);

    if (!data.success) {
      toast.error(data.error || "Registration failed");
      return;
    }

    toast.success("Account created. Signing in...");
    await signIn("credentials", {
      email: body.email,
      password: body.password,
      redirect: false,
    });
    router.push("/");
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div>
        <label htmlFor="name" className="block text-sm font-medium text-stone-700 mb-1">
          Full name
        </label>
        <input id="name" name="name" required minLength={2}
          className="w-full px-4 py-2 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500" />
      </div>
      <div>
        <label htmlFor="email" className="block text-sm font-medium text-stone-700 mb-1">
          Email
        </label>
        <input id="email" name="email" type="email" required
          className="w-full px-4 py-2 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500" />
      </div>
      <div>
        <label htmlFor="password" className="block text-sm font-medium text-stone-700 mb-1">
          Password (min 8 characters)
        </label>
        <input id="password" name="password" type="password" required minLength={8}
          className="w-full px-4 py-2 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500" />
      </div>
      <div>
        <label htmlFor="languageId" className="block text-sm font-medium text-stone-700 mb-1">
          Language
        </label>
        <select id="languageId" name="languageId" required
          className="w-full px-4 py-2 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500">
          <option value="">Select a language</option>
          {languages.map((l) => (
            <option key={l.id} value={l.id}>
              {l.nativeName} ({l.name})
            </option>
          ))}
        </select>
      </div>
      <div>
        <label htmlFor="role" className="block text-sm font-medium text-stone-700 mb-1">
          I am a...
        </label>
        <select id="role" name="role" required defaultValue="registered"
          className="w-full px-4 py-2 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500">
          <option value="registered">Community member</option>
          <option value="student">Student</option>
          <option value="teacher">Teacher</option>
          <option value="researcher">Researcher</option>
          <option value="contributor">Contributor</option>
          <option value="elder">Elder</option>
        </select>
      </div>
      <button type="submit" disabled={loading}
        className="w-full bg-amber-600 text-white py-2.5 rounded-lg font-medium hover:bg-amber-700 disabled:opacity-50 transition">
        {loading ? "Creating account..." : "Create account"}
      </button>
    </form>
  );
}
