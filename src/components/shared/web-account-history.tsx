"use client";

import { useEffect, useState } from "react";
import { AccountHistoryView } from "@/components/shared/account-history-view";
import { createAppClient } from "@/lib/app-client";
import type { AppAccount, ConversationHistory } from "@/lib/account-contract";

export function WebAccountHistory({ account }: { account: AppAccount }) {
  const [history, setHistory] = useState<ConversationHistory>([]);
  const [archived, setArchived] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    let active = true;
    const timeout = window.setTimeout(() => controller.abort(), 20000);
    setLoading(true); setError(""); setHistory([]);
    createAppClient({ origin: window.location.origin }).conversations(archived, controller.signal)
      .then(value => { if (active) setHistory(value); })
      .catch(reason => { if (active) setError(reason instanceof Error ? reason.message : "Unable to load saved chats."); })
      .finally(() => { clearTimeout(timeout); if (active) setLoading(false); });
    return () => { active = false; clearTimeout(timeout); controller.abort(); };
  }, [archived, retry]);
  return <AccountHistoryView account={account} history={history} archived={archived} loading={loading} error={error} onArchivedChange={setArchived} onRetry={() => setRetry(value => value + 1)} onOpenChat={id => { window.location.href = `/chatbot?conversation=${encodeURIComponent(id)}`; }} />;
}
