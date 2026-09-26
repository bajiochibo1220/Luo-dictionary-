import Link from "next/link";
import { LoginForm } from "@/components/forms/login-form";

export default function LoginPage() {
  return (
    <div className="bg-white rounded-2xl shadow-xl p-8">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-serif text-stone-800 mb-2">Welcome back</h1>
        <p className="text-stone-500">Sign in to LuoLinguaAI</p>
      </div>
      <LoginForm />
      <p className="text-center mt-6 text-sm text-stone-500">
        Don&apos;t have an account?{" "}
        <Link href="/register" className="text-amber-600 hover:underline">
          Register
        </Link>
      </p>
    </div>
  );
}
