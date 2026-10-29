"use client";
import { usePathname } from "next/navigation";
import { ChatbotShortcut } from "@/components/shared/chatbot-shortcut";

export function FloatingChatbot() {
  const pathname = usePathname();
  // The shared web/native application supplies its own hash-route shortcut.
  if (pathname === "/application" || pathname === "/chatbot") return null;
  return <ChatbotShortcut />;
}
