import { PasswordResetForm } from "@/components/forms/password-reset-form";

export const metadata = { title: "Reset password", referrer: "no-referrer" };
export default function ForgotPasswordPage() {
  return <PasswordResetForm />;
}
