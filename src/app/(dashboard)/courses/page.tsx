import { auth } from "@/lib/auth";
import { getDefaultPublicLanguage } from "@/lib/public-navigation";
import { WebEducationHub } from "@/components/shared/web-education-hub";
export default async function CoursesPage() {
  const [session, language] = await Promise.all([auth(), getDefaultPublicLanguage()]);
  if (!session?.user || !language) return <p className="p-8">Sign in and choose an active language to access courses.</p>;
  return <WebEducationHub userId={session.user.id} languageId={language.id} initialView="courses" />;
}
