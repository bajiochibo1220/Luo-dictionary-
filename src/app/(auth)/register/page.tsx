import Link from "next/link";
import { RegisterForm } from "@/components/forms/register-form";

export default function RegisterPage() {
  return (
    <div className="bg-white rounded-2xl shadow-xl p-8">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-serif text-stone-800 mb-2">Join LuoLinguaAI</h1>
        <p className="text-stone-500">Create your account</p>
      </div>
      <RegisterForm />
      <p className="text-center mt-6 text-sm text-stone-500">
        Already have an account?{" "}
        <Link href="/login" className="text-amber-600 hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  );
}
