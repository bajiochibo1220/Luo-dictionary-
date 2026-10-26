"use client";

import { useCallback, useMemo } from "react";
import { signOut } from "next-auth/react";
import { BackLink } from "@/components/layout/back-link";
import { SharedChatInterface } from "@/components/shared/chat-interface";
import { createChatTransport } from "@/lib/chat-transport";

export function ChatInterface({ languageCode = "luo", cultureCode = languageCode, guest = false, initialConversationId }: { languageCode?: string; cultureCode?: string; guest?: boolean; initialConversationId?: string }) {
  const request = useMemo(() => (path: string, init?: RequestInit) => createChatTransport({ origin: window.location.origin })(path, init), []);
  const onSessionExpired = useCallback(() => { void signOut({ redirectTo: "/login" }); }, []);
  return <div className="h-dvh"><SharedChatInterface languageCode={languageCode} cultureCode={cultureCode} guest={guest} request={request} BackLink={BackLink} onSessionExpired={onSessionExpired} initialConversationId={initialConversationId} /></div>;
}
