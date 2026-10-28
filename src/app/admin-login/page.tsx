import { AuthShell } from "@/components/layout/auth-shell";
import LoginPage from "@/app/(auth)/login/page";

export default function AdminLoginPage(props: { searchParams: Promise<{ callbackUrl?: string }> }) {
  return <AuthShell><LoginPage {...props} /></AuthShell>;
}
