import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { ChatInterface } from "@/components/ai/chat-interface";

export const dynamic = "force-dynamic";

export default async function ChatbotPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const user = session.user as any;
  const languageCode = ((user.languageRoles ?? []) as any[])[0]?.languageCode ?? "luo";

  return <ChatInterface languageCode={languageCode} />;
}