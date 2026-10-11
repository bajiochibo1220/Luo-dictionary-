import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";

// Retire the old language landing screen, including bookmarked /luo and /eng URLs.
export default async function LanguageHomePage() {
  const session = await auth();
  redirect(session?.user?.id ? "/dashboard" : "/login");
}
