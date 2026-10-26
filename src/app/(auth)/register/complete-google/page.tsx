import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { GoogleProfileForm } from "@/components/forms/google-profile-form";
import { cookies } from "next/headers";
import { NATIVE_RETURN_COOKIE, nativeReturnFromCookie } from "@/lib/native-auth-contract";

export default async function CompleteGoogleRegistrationPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const nativeReturn = nativeReturnFromCookie((await cookies()).get(NATIVE_RETURN_COOKIE)?.value);

  return (
    <div>
      <h1 className="mb-2 font-serif text-3xl text-stone-900">Finish creating your account</h1>
      <p className="mb-6 text-sm text-stone-600">Add a few details to complete your sign-up.</p>
      <GoogleProfileForm initialName={session.user.name ?? ""} nativeReturn={nativeReturn} />
    </div>
  );
}
