"use client";

import { useCallback, useMemo } from "react";
import { signOut } from "next-auth/react";
import { BackLink } from "@/components/layout/back-link";
import { SharedChatInterface } from "@/components/shared/chat-interface";
import { createChatTransport } from "@/lib/chat-transport";
import { useRouter } from "next/navigation";
import { EnglishInterface } from "@/components/shared/interface-language";

export function ChatInterface({ languageCode = "luo", cultureCode = languageCode, guest = false, initialConversationId, admin = false }: { languageCode?: string; cultureCode?: string; guest?: boolean; initialConversationId?: string; admin?: boolean }) {
  const router = useRouter();
  const request = useMemo(() => (path: string, init?: RequestInit) => createChatTransport({ origin: window.location.origin })(path, init), []);
  const onSessionExpired = useCallback(() => { void signOut({ redirectTo: "/login" }); }, []);
  return <EnglishInterface enabled={admin}><div className="h-dvh"><SharedChatInterface languageCode={languageCode} cultureCode={cultureCode} guest={guest} request={request} BackLink={BackLink} onSessionExpired={onSessionExpired} initialConversationId={initialConversationId} onClose={() => router.push(admin ? "/admin/dashboard" : "/application")} /></div></EnglishInterface>;
}
