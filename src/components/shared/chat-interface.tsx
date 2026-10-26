"use client";
import { InterfaceButton, InterfaceInput, InterfaceOption, InterfaceText } from "@/components/shared/interface-language";

import { useState, useRef, useEffect, useCallback, useMemo, type ComponentType, type ReactNode } from "react";
import { publicSourceHref } from "@/lib/app-navigation";

export type ChatTransport = (path: string, init?: RequestInit) => Promise<Response>;
type BackLinkProps = { href?: string; label?: string; variant?: "default" | "on-dark" | "on-sand" };

type Source = {
  id: string;
  title: string;
  module: string;
  similarity: number;
};

type MediaItem = {
  recordId: string;
  title: string;
  module: string;
  mediaType: string;
  url: string;
  thumbnailUrl: string | null;
  format: string | null;
};

type Message = {
  role: "user" | "assistant";
  content: string;
  sources?: Source[];
};

type ConversationListItem = {
  id: string;
  title: string;
  pinned: boolean;
  archived: boolean;
  messageCount: number;
  updatedAt: string;
};

const SUGGESTED = [
  "What are Luo marriage customs?",
  "Show me the Luo cultural artifact videos",
  "Explain the proverb Ng'ato ok nyal timo gima ok onyal",
  "What does nyathi mean?",
];

function PlainSourceLink({ href, children, className }: { href: string; children: ReactNode; className?: string }) { return <a href={href} className={className}>{children}</a>; }

export function SharedChatInterface({ languageCode = "luo", cultureCode = languageCode, guest = false, request, BackLink, onSessionExpired, initialConversationId, Link = PlainSourceLink }: {
  languageCode?: string; cultureCode?: string; guest?: boolean;
  request: ChatTransport; BackLink: ComponentType<BackLinkProps>;
  onSessionExpired: () => void; initialConversationId?: string;
  Link?: ComponentType<{ href: string; children: ReactNode; className?: string }>;
}) {
  const [answerLanguageCode, setAnswerLanguageCode] = useState(languageCode);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [conversations, setConversations] = useState<ConversationListItem[]>([]);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showArchived, setShowArchived] = useState(false);
  const [mediaPanel, setMediaPanel] = useState<MediaItem[]>([]);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [notice, setNotice] = useState<{ text: ReactNode; error: boolean } | null>(null);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [conversationLoading, setConversationLoading] = useState(false);
  const [historyFailed, setHistoryFailed] = useState(false);
  const [beforeId, setBeforeId] = useState<string | null>(null);
  const [allowExternalAi, setAllowExternalAi] = useState(false);
  const loadSequence = useRef(0);
  const historySequence = useRef(0);
  const disposed = useRef(false);
  const toast = useMemo(() => ({
    error: (text: ReactNode) => setNotice({ text, error: true }),
    success: (text: ReactNode) => setNotice({ text, error: false }),
  }), []);
  useEffect(() => { disposed.current = false; ++loadSequence.current; return () => { disposed.current = true; }; }, []);

  // If session is stale, force sign out
  const handleStale = useCallback(async () => {
    toast.error(<InterfaceText source={"Your session expired. Please sign in again."} />);
    onSessionExpired();
  }, [onSessionExpired, toast]);

  const loadConversations = useCallback(async () => {
    if (guest) return;
    const sequence = ++historySequence.current;
    setHistoryLoading(true); setHistoryFailed(false);
    try {
      const url = `/api/conversations${showArchived ? "?archived=true" : ""}`;
      const res = await request(url);
      const json = await res.json();
      if (disposed.current || sequence !== historySequence.current) return;
      if (res.status === 401) {
        handleStale();
        return;
      }
      if (!res.ok || !json.success) throw new Error("Unable to load saved chats.");
      if (!disposed.current) setConversations(json.data);
    } catch { if (!disposed.current && sequence === historySequence.current) setHistoryFailed(true); }
    finally { if (!disposed.current && sequence === historySequence.current) setHistoryLoading(false); }
  }, [showArchived, handleStale, guest, request]);

  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages]);

  useEffect(() => {
    const close = () => setOpenMenuId(null);
    if (openMenuId) {
      document.addEventListener("click", close);
      return () => document.removeEventListener("click", close);
    }
  }, [openMenuId]);

  const loadConversation = useCallback(async (id: string, before?: string) => {
    const sequence = ++loadSequence.current;
    setConversationLoading(true);
    try {
      const res = await request(`/api/conversations/${encodeURIComponent(id)}${before ? `?before=${encodeURIComponent(before)}` : ""}`);
      const json = await res.json();
      if (disposed.current) return;
      if (res.status === 401) { handleStale(); return; }
      if (!res.ok || !json.success) throw new Error(json.error || "Unable to open chat.");
      if (disposed.current || sequence !== loadSequence.current) return;

      const loaded: Message[] = [];
      for (const m of json.data.messages) {
        loaded.push({ role: "user", content: m.query });
        loaded.push({
          role: "assistant",
          content: m.response,
          sources: m.sources ?? [],
        });
      }
      setMessages(previous => before ? [...loaded, ...previous] : loaded);
      setConversationId(id);
      setBeforeId(json.data.beforeId ?? null);
      setMediaPanel([]);
      setSidebarOpen(false);
      setOpenMenuId(null);
    } catch (error) {
      if (!disposed.current && sequence === loadSequence.current) toast.error(<InterfaceText source={error instanceof Error ? error.message : "Failed to load conversation"} />);
    } finally { if (!disposed.current && sequence === loadSequence.current) setConversationLoading(false); }
  }, [request, handleStale, toast]);
  useEffect(() => { if (initialConversationId && !guest) void loadConversation(initialConversationId); }, [initialConversationId, guest, loadConversation]);

  async function patchConversation(id: string, payload: any) {
    try {
      const res = await request(`/api/conversations/${encodeURIComponent(id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (res.status === 401) { handleStale(); return false; }
      if (!res.ok) throw new Error();
      return true;
    } catch {
      toast.error(<InterfaceText source={"Failed"} />);
      return false;
    }
  }

  async function handleRename(id: string, currentTitle: string) {
    const newTitle = prompt("Rename chat:", currentTitle);
    if (!newTitle || newTitle === currentTitle) return;
    if (await patchConversation(id, { title: newTitle })) {
      setConversations((c) =>
        c.map((x) => (x.id === id ? { ...x, title: newTitle } : x))
      );
      toast.success(<InterfaceText source={"Renamed"} />);
    }
    setOpenMenuId(null);
  }

  async function handlePin(id: string, pinned: boolean) {
    if (await patchConversation(id, { pinned: !pinned })) {
      toast.success(<InterfaceText source={pinned ? "Unpinned" : "Pinned"} />);
      loadConversations();
    }
    setOpenMenuId(null);
  }

  async function handleArchive(id: string, archived: boolean) {
    if (await patchConversation(id, { archived: !archived })) {
      toast.success(<InterfaceText source={archived ? "Unarchived" : "Archived"} />);
      if (conversationId === id) {
        setConversationId(null);
        setMessages([]);
      }
      loadConversations();
    }
    setOpenMenuId(null);
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this chat permanently?")) return;
    try {
      const response = await request(`/api/conversations/${encodeURIComponent(id)}`, { method: "DELETE", headers: { "Content-Type": "application/json" } });
      if (response.status === 401) { handleStale(); return; }
      if (!response.ok) throw new Error("Failed to delete chat.");
      setConversations((c) => c.filter((x) => x.id !== id));
      if (conversationId === id) {
        setConversationId(null);
        setMessages([]);
        setMediaPanel([]);
      }
      toast.success(<InterfaceText source={"Deleted"} />);
    } catch {
      toast.error(<InterfaceText source={"Failed to delete"} />);
    }
    setOpenMenuId(null);
  }

  function startNewChat() {
    ++loadSequence.current;
    setConversationLoading(false);
    setConversationId(null);
    setMessages([]);
    setMediaPanel([]);
    setInput("");
    setSidebarOpen(false);
    setBeforeId(null); setNotice(null);
  }

  async function send(question: string) {
    if (!question.trim() || busy || conversationLoading) return;
    if (!allowExternalAi) { toast.error(<InterfaceText source={"Please allow AI processing before sending a question."} />); return; }
    if (question.trim().length < 2 || question.trim().length > 2000) { toast.error(<InterfaceText source={"Enter a question between 2 and 2000 characters."} />); return; }
    ++loadSequence.current;

    const userMessage: Message = { role: "user", content: question };
    setMessages((m) => [...m, userMessage]);
    setInput("");
    setMediaPanel([]);
    setBusy(true);

    try {
      const res = await request("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question,
          languageCode: answerLanguageCode,
          cultureCode,
          conversationId,
          allowExternalAi,
          history: guest ? messages.slice(-8).map(({ role, content }) => ({ role, content: content.slice(0, 2000) })) : undefined,
        }),
      });

      const json = await res.json();

      if (disposed.current) return;
      if (res.status === 401) {
        handleStale();
        return;
      }

      if (!res.ok || !json.success) throw new Error(json.error || "Chat failed");

      setMessages((m) => [
        ...m,
        {
          role: "assistant",
          content: json.data.answer,
          sources: json.data.sources,
        },
      ]);

      if (json.data.conversationId) setConversationId(json.data.conversationId);
      setMediaPanel(json.data.media ?? []);

      loadConversations();
    } catch (err: any) {
      if (disposed.current) return;
      toast.error(<InterfaceText source={err.message || "Chat failed"} />);
      setMessages(m => m.slice(0, -1));
      setInput(question);
    } finally {
      if (!disposed.current) setBusy(false);
    }
  }

  return (
    <div className="h-full min-h-[28rem] flex bg-[#b89a68] relative overflow-hidden">
      <aside
          className={`${guest ? "hidden" : ""} ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        } md:translate-x-0 absolute md:relative inset-y-0 left-0 z-30 w-72 bg-[#6b4724] border-r border-black/20 transition-transform flex flex-col`}
      >
        <div className="p-3 border-b border-amber-100/15 space-y-2">
          <div className="md:hidden mb-2">
            <BackLink href={`/${cultureCode}`} label="Back to language home" variant="on-dark" />
          </div>
          <button
            onClick={startNewChat}
            disabled={busy}
            className="w-full flex items-center justify-center gap-2 bg-amber-400 text-stone-900 py-2.5 rounded-full font-semibold text-sm hover:bg-amber-300 transition shadow-sm"
          >
            <span className="text-base">+</span><InterfaceText source=" New chat" /></button>
          <button
            onClick={() => setShowArchived(!showArchived)}
            className="w-full text-[11px] uppercase tracking-wider text-amber-100/60 hover:text-amber-50 py-1 transition"
          >
            <InterfaceText source={showArchived ? "← Back to chats" : "View archived"} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto py-2">
          {historyLoading ? <p role="status" className="px-4 py-3 text-sm text-amber-50"><InterfaceText source="Loading saved chats…" /></p> : historyFailed ? <div role="alert" className="px-4 py-3 text-sm text-amber-50"><p><InterfaceText source="Unable to load saved chats." /></p><button type="button" onClick={loadConversations} className="mt-2 underline"><InterfaceText source="Try again" /></button></div> : conversations.length === 0 ? (
            <p className="text-xs text-amber-100/50 px-4 py-3">
              <InterfaceText source={showArchived ? "No archived chats" : "No chats yet"} />
            </p>
          ) : (
            conversations.map((c) => (
              <div
                key={c.id}
                className={`group relative px-4 py-2.5 cursor-pointer flex items-center gap-2 hover:bg-black/20 ${
                  conversationId === c.id ? "bg-black/25" : ""
                }`}
              >
                {c.pinned && (
                  <span className="text-amber-300 text-xs shrink-0">📌</span>
                )}
                <button type="button" disabled={busy} aria-pressed={conversationId === c.id} onClick={() => { void loadConversation(c.id); }} className="min-w-0 flex-1 text-left">
                  <p className="text-sm text-amber-50 truncate leading-tight">
                    {c.title}
                  </p>
                  <p className="text-[10px] text-amber-200/50 mt-0.5">
                    {c.messageCount}<InterfaceText source=" message" /><InterfaceText source={c.messageCount === 1 ? "" : "s"} />
                  </p>
                </button>

                <InterfaceButton
                  onClick={(e) => {
                    e.stopPropagation();
                    setOpenMenuId(openMenuId === c.id ? null : c.id);
                  }}
                  disabled={busy}
                  aria-label={`Options for ${c.title}`}
                  className="md:opacity-0 md:group-hover:opacity-100 focus:opacity-100 text-amber-100/70 hover:text-amber-50 transition px-2 py-2"
                  title="Options"
                >
                  ⋯
                </InterfaceButton>

                {openMenuId === c.id && (
                  <div
                    className="absolute right-2 top-8 z-50 w-40 bg-stone-900 rounded-lg shadow-2xl border border-amber-100/10 py-1"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <MenuItem
                      icon="✎"
                      label="Rename"
                      onClick={() => handleRename(c.id, c.title)}
                    />
                    <MenuItem
                      icon="📌"
                      label={c.pinned ? "Unpin" : "Pin"}
                      onClick={() => handlePin(c.id, c.pinned)}
                    />
                    <MenuItem
                      icon="🗄"
                      label={c.archived ? "Unarchive" : "Archive"}
                      onClick={() => handleArchive(c.id, c.archived)}
                    />
                    <MenuItem
                      icon="✕"
                      label="Delete"
                      danger
                      onClick={() => handleDelete(c.id)}
                    />
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        <div className="p-3 border-t border-amber-100/15 text-[10px] text-amber-100/40 text-center tracking-widest"><InterfaceText source="JOOUST · NRF" /></div>
      </aside>

      {sidebarOpen && (
        <div
          className="md:hidden fixed inset-0 bg-black/50 z-20"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <div className="flex-1 min-w-0 flex flex-col">
        {conversationLoading && <p role="status" className="bg-amber-100 px-4 py-2 text-sm"><InterfaceText source="Loading chat…" /></p>}
        {notice && <div role={notice.error ? "alert" : "status"} className={`flex items-center justify-between gap-3 px-4 py-3 text-sm ${notice.error ? "bg-red-50 text-red-900" : "bg-green-50 text-green-900"}`}><p>{notice.text}</p><InterfaceButton type="button" aria-label="Dismiss message" onClick={() => setNotice(null)}>×</InterfaceButton></div>}
        <header className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 border-b border-stone-900/15 bg-[#a9895a]">
          <div className="flex items-center gap-2 md:gap-3">
            <div className="hidden md:block">
              <BackLink href={`/${cultureCode}`} label="Back to language home" variant="on-sand" />
            </div>
            <InterfaceButton
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className={`${guest ? "hidden" : ""} md:hidden text-stone-900 text-2xl leading-none`}
              aria-label="Menu"
            >
              ☰
            </InterfaceButton>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-linear-to-br from-amber-500 to-amber-700 flex items-center justify-center">
                <span className="text-white text-sm">💬</span>
              </div>
            <div>
                <h1 className="font-serif text-base md:text-lg text-stone-900 leading-tight"><InterfaceText source="Chat with Luo Lingua" /></h1>
                <p className="text-[10px] uppercase tracking-widest text-stone-800/60 hidden sm:block"><InterfaceText source="AI Cultural Assistant" /></p>
              </div>
            </div>
            </div>
            {cultureCode !== "eng" && <label className="text-xs font-semibold text-stone-800"><InterfaceText source="Answer language " /><select value={answerLanguageCode} onChange={(event) => setAnswerLanguageCode(event.target.value)} className="ml-2 rounded-md border border-stone-800/20 bg-white/70 px-2 py-1"><InterfaceOption value={cultureCode}>Original language</InterfaceOption><InterfaceOption value="eng">English — {cultureCode} culture</InterfaceOption></select></label>}
        </header>

        <div className="flex-1 flex min-h-0 flex-col lg:flex-row">
          <div
            ref={scrollRef}
            className="flex-1 overflow-y-auto overscroll-contain px-4 md:px-8 py-6"
          >
            {beforeId && conversationId && <button type="button" disabled={busy} onClick={() => loadConversation(conversationId, beforeId)} className="mx-auto mb-4 block rounded-full bg-white/70 px-4 py-2 text-sm"><InterfaceText source="Load earlier messages" /></button>}
            {messages.length === 0 ? (
              <div className="max-w-2xl mx-auto text-center pt-8">
                <div className="text-5xl mb-4">💬</div>
                <h2 className="text-2xl font-serif text-stone-900 mb-2"><InterfaceText source="Ask about Luo Culture" /></h2>
                <p className="text-sm text-stone-800/70 mb-8"><InterfaceText source="I answer questions using our curated cultural knowledge base. Ask for videos, images, audio, or specific topics." /></p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {SUGGESTED.map((q) => (
                    <button
                      key={q}
                      disabled={busy || !allowExternalAi}
                      onClick={() => send(q)}
                      className="text-left p-4 bg-black/5 hover:bg-black/10 border border-stone-900/15 hover:border-amber-800/50 rounded-xl text-sm text-stone-900 transition shadow-xs"
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="max-w-2xl mx-auto space-y-5">
                {messages.map((m, i) => (
                  <div key={i}>
                    {m.role === "user" ? (
                      <div className="flex justify-end">
                        <div className="max-w-md bg-stone-900 text-amber-50 rounded-2xl rounded-tr-sm px-4 py-2.5 shadow-sm">
                          <p className="text-sm whitespace-pre-line">
                            {m.content}
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div className="flex justify-start">
                        <div className="max-w-xl">
                          <div className="bg-black/5 backdrop-blur-sm rounded-2xl rounded-tl-sm px-4 py-3 shadow-xs border border-stone-900/10">
                            <p className="text-sm text-stone-900 whitespace-pre-line leading-relaxed">
                              {m.content}
                            </p>
                          </div>
                          {m.sources && m.sources.length > 0 && (
                            <div className="mt-2 flex flex-wrap gap-2">
                              {m.sources.map((s, j) => {
                                const href = publicSourceHref(cultureCode, s);
                                const text = `[${j + 1}] ${s.title.slice(0, 40)}${s.title.length > 40 ? "…" : ""}`;
                                const className = "text-xs px-2 py-1 bg-black/5 text-amber-900 border border-amber-800/20 rounded-full";
                                return href ? <Link key={`${s.id}:${j}`} href={href} className={className}>{text}</Link> : <span key={`${s.id}:${j}`} className={className}>{text}</span>;
                              })}
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
                {busy && (
                  <div className="flex justify-start">
                    <div className="bg-black/5 rounded-2xl px-4 py-3 shadow-xs">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 bg-amber-600 rounded-full animate-bounce" />
                        <span
                          className="w-2 h-2 bg-amber-600 rounded-full animate-bounce"
                          style={{ animationDelay: "0.15s" }}
                        />
                        <span
                          className="w-2 h-2 bg-amber-600 rounded-full animate-bounce"
                          style={{ animationDelay: "0.3s" }}
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {mediaPanel.length > 0 && (
            <div className="flex w-full max-h-56 lg:max-h-none lg:w-80 shrink-0 border-t lg:border-t-0 lg:border-l border-stone-900/15 bg-[#a9895a] flex-col">
              <div className="px-4 py-3 border-b border-stone-900/15 flex items-center justify-between">
                <div>
                  <p className="text-[10px] uppercase tracking-widest text-stone-800/60"><InterfaceText source="Results" /></p>
                  <p className="font-serif text-base text-stone-900">
                    {mediaPanel.length}<InterfaceText source=" item" /><InterfaceText source={mediaPanel.length === 1 ? "" : "s"} />
                  </p>
                </div>
                <button
                  onClick={() => setMediaPanel([])}
                  className="text-stone-800/60 hover:text-stone-900 text-sm"
                >
                  ✕
                </button>
              </div>
              <div className="flex-1 overflow-y-auto overscroll-contain p-3 space-y-3">
                {mediaPanel.map((m, i) => (
                  <MediaCard key={`${m.recordId}-${i}`} media={m} />
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="border-t border-stone-900/15 bg-[#a9895a] p-3 md:p-4">
          <label className="mx-auto mb-3 flex max-w-2xl items-start gap-2 text-xs text-stone-900"><input type="checkbox" checked={allowExternalAi} onChange={event => setAllowExternalAi(event.target.checked)} disabled={busy} className="mt-0.5" /><span><InterfaceText source="Allow Google AI to process my question and recent chat messages to produce an answer. Avoid sending private or sensitive information." /></span></label>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              send(input);
            }}
            className="max-w-2xl mx-auto flex gap-2"
          >
            <InterfaceInput
              type="text"
              value={input}
              aria-label="Your question"
              maxLength={2000}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about Luo culture, songs, artifact videos..."
              disabled={busy || conversationLoading}
              className="min-w-0 flex-1 px-4 py-3 bg-white border border-stone-900/20 rounded-full focus:outline-hidden focus:ring-2 focus:ring-amber-800 text-sm text-stone-900 placeholder:text-stone-800/40 disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={busy || conversationLoading || !allowExternalAi || input.trim().length < 2}
              className="px-6 py-3 bg-stone-900 text-amber-50 rounded-full text-sm font-semibold hover:bg-amber-900 disabled:opacity-40 transition shadow-sm"
            ><InterfaceText source="Send" /></button>
          </form>
        </div>
      </div>
    </div>
  );
}

function MenuItem({
  icon,
  label,
  onClick,
  danger,
}: {
  icon: string;
  label: string;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full text-left px-3 py-2 text-sm flex items-center gap-2 transition ${
        danger
          ? "text-red-300 hover:bg-red-900/40"
          : "text-amber-50 hover:bg-amber-100/10"
      }`}
    >
      <span className="w-4 text-center">{icon}</span>
      {label}
    </button>
  );
}

function MediaCard({ media }: { media: MediaItem }) {
  return (
    <div className="bg-black/5 backdrop-blur-sm rounded-xl border border-stone-900/10 overflow-hidden shadow-xs">
      <div className="bg-stone-900">
        {media.mediaType === "image" && (
          <img
            src={media.url}
            alt={media.title}
            className="w-full max-h-64 object-cover"
          />
        )}
        {media.mediaType === "video" && (
          <video
            src={media.url}
            poster={media.thumbnailUrl || undefined}
            controls
            className="w-full max-h-64"
          />
        )}
        {media.mediaType === "audio" && (
          <div className="p-4">
            <p className="text-xs text-amber-100/70 mb-2"><InterfaceText source="🎵 Audio" /></p>
            <audio src={media.url} controls className="w-full" />
          </div>
        )}
      </div>
      <div className="p-3">
        <p className="text-[10px] uppercase tracking-wider text-amber-900/70 mb-0.5">
          {media.module}
        </p>
        <p className="font-serif text-sm text-stone-900 line-clamp-2 leading-tight">
          {media.title}
        </p>
      </div>
    </div>
  );
}
