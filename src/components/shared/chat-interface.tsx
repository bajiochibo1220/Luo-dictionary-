"use client";
import { MediaAudio, MediaImage, MediaVideo } from "@/components/shared/media-preview";

import { InterfaceButton, InterfaceOption, InterfaceText, InterfaceTextarea } from "@/components/shared/interface-language";


import { useState, useRef, useEffect, useCallback, useMemo, type ComponentType, type ReactNode } from "react";
import { X, History, Plus, MessageCircle, MoreHorizontal, Pin, ArrowUp, ArrowUpRight, LoaderCircle } from "lucide-react";
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

export function SharedChatInterface({ languageCode = "luo", cultureCode = languageCode, guest = false, request, BackLink, onSessionExpired, initialConversationId, onClose, Link = PlainSourceLink }: {
  languageCode?: string; cultureCode?: string; guest?: boolean;
  request: ChatTransport; BackLink: ComponentType<BackLinkProps>;
  onSessionExpired: () => void; initialConversationId?: string; onClose?: () => void;
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
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const [notice, setNotice] = useState<{ text: ReactNode; error: boolean } | null>(null);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [conversationLoading, setConversationLoading] = useState(false);
  const [historyFailed, setHistoryFailed] = useState(false);
  const [beforeId, setBeforeId] = useState<string | null>(null);
  const [allowExternalAi, setAllowExternalAi] = useState(false);
  const restoredScroll = useRef<{ height: number; top: number } | null>(null);
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
    if (restoredScroll.current && scrollRef.current) {
      scrollRef.current.scrollTop = restoredScroll.current.top + scrollRef.current.scrollHeight - restoredScroll.current.height;
      restoredScroll.current = null;
      return;
    }
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages]);

  useEffect(() => {
    const escape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      if (openMenuId) setOpenMenuId(null);
      else if (sidebarOpen) setSidebarOpen(false);
      else onClose?.();
    };
    document.addEventListener("keydown", escape);
    return () => document.removeEventListener("keydown", escape);
  }, [openMenuId, sidebarOpen, onClose]);

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
      if (before && scrollRef.current) restoredScroll.current = { height: scrollRef.current.scrollHeight, top: scrollRef.current.scrollTop };
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
    <div className="chat-workspace relative flex h-full min-h-0 overflow-hidden">
      {sidebarOpen && !guest && <>
        <InterfaceButton type="button" className="absolute inset-0 z-20 bg-stone-950/35 md:hidden" aria-label="Close chat history" onClick={() => setSidebarOpen(false)} />
        <aside aria-label="Chat history" className="chat-history absolute inset-y-0 left-0 z-30 flex w-[min(20rem,85vw)] shrink-0 flex-col border-r md:relative md:w-72">
          <div className="flex items-center justify-between gap-2 border-b border-white/15 p-3"><h2 className="font-semibold"><InterfaceText source="Your chats" /></h2><InterfaceButton type="button" aria-label="Close chat history" onClick={() => setSidebarOpen(false)} className="chat-icon-button"><X size={20} /></InterfaceButton></div>
          <div className="space-y-2 p-3"><button type="button" onClick={startNewChat} disabled={busy} className="flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-white px-3 text-sm font-semibold text-teal-950 disabled:opacity-50"><Plus size={18} /><InterfaceText source="New chat" /></button><button type="button" disabled={busy} onClick={() => setShowArchived(value => !value)} className="min-h-11 w-full rounded-lg text-sm text-teal-100 hover:bg-white/10"><InterfaceText source={showArchived ? "Show active chats" : "Show archived chats"} /></button></div>
          <div className="min-h-0 flex-1 overflow-y-auto p-2">
            {historyLoading ? <p role="status" className="p-3 text-sm"><InterfaceText source="Loading chats…" /></p> : historyFailed ? <div role="alert" className="space-y-2 p-3 text-sm"><p><InterfaceText source="Unable to load saved chats." /></p><button type="button" onClick={() => void loadConversations()} className="min-h-11 underline"><InterfaceText source="Try again" /></button></div> : !conversations.length ? <p className="p-3 text-sm text-teal-100"><InterfaceText source="No saved chats yet." /></p> : conversations.map(conversation => <div key={conversation.id} className={`relative mb-1 rounded-xl ${conversationId === conversation.id ? "bg-white/15" : "hover:bg-white/10"}`}>
              <div className="flex items-center"><button type="button" disabled={busy || conversationLoading} onClick={() => void loadConversation(conversation.id)} className="min-h-12 min-w-0 flex-1 p-3 text-left text-sm disabled:opacity-50"><span className="block truncate">{conversation.pinned && <Pin size={12} className="mr-1 inline" />}{conversation.title}</span></button><InterfaceButton type="button" aria-label="Chat options" title="Chat options" disabled={busy} onClick={event => { event.stopPropagation(); setOpenMenuId(openMenuId === conversation.id ? null : conversation.id); }} className="chat-icon-button"><MoreHorizontal size={20} /></InterfaceButton></div>
              {openMenuId === conversation.id && <div className="absolute right-2 top-11 z-40 w-44 rounded-xl border border-white/20 bg-teal-950 p-1 shadow-xl" onClick={event => event.stopPropagation()}><MenuItem icon="" label="Rename" onClick={() => void handleRename(conversation.id, conversation.title)} /><MenuItem icon="" label={conversation.pinned ? "Unpin" : "Pin"} onClick={() => void handlePin(conversation.id, conversation.pinned)} /><MenuItem icon="" label={conversation.archived ? "Unarchive" : "Archive"} onClick={() => void handleArchive(conversation.id, conversation.archived)} /><MenuItem icon="" label="Delete" danger onClick={() => void handleDelete(conversation.id)} /></div>}
            </div>)}
          </div>
        </aside>
      </>}
      <section className="flex min-h-0 min-w-0 flex-1 flex-col" aria-label="AI cultural assistant">
        <header className="chat-header flex shrink-0 items-center justify-between gap-3 border-b px-3 py-3 sm:px-6">
          <div className="flex min-w-0 items-center gap-3">{!guest && <InterfaceButton type="button" aria-label="Open chat history" title="Your chats" aria-expanded={sidebarOpen} onClick={() => setSidebarOpen(value => !value)} className="chat-icon-button"><History size={20} /></InterfaceButton>}<span className="hidden rounded-xl bg-teal-50 p-2 text-teal-800 sm:inline-flex"><MessageCircle size={22} /></span><div className="min-w-0"><h1 className="text-base font-semibold text-teal-950 sm:text-lg"><InterfaceText source="AI cultural assistant" /></h1><p className="text-xs text-stone-500"><InterfaceText source="Language, stories & living knowledge" /></p></div></div>
          <div className="flex shrink-0 items-center gap-1"><InterfaceButton type="button" aria-label="New chat" title="New chat" disabled={busy} onClick={startNewChat} className="chat-icon-button"><Plus size={20} /></InterfaceButton>{onClose ? <InterfaceButton type="button" aria-label="Close chat" title="Close chat" onClick={onClose} className="chat-icon-button"><X size={22} /></InterfaceButton> : <Link href="/dashboard" className="chat-icon-button"><X size={22} /><span className="sr-only"><InterfaceText source="Close chat" /></span></Link>}</div>
        </header>
        {notice && <div role={notice.error ? "alert" : "status"} className={`flex shrink-0 items-start justify-between gap-3 px-4 py-3 text-sm ${notice.error ? "bg-red-50 text-red-900" : "bg-teal-50 text-teal-950"}`}><p>{notice.text}</p><InterfaceButton type="button" aria-label="Dismiss message" onClick={() => setNotice(null)} className="shrink-0 p-1"><X size={18} /></InterfaceButton></div>}
        <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-6 sm:px-8" role="log" aria-label="Conversation" aria-live="polite" aria-busy={busy || conversationLoading}>
          {conversationLoading && <p role="status" className="mx-auto mb-4 max-w-2xl text-sm text-teal-800"><InterfaceText source="Loading chat…" /></p>}
          {beforeId && conversationId && <button type="button" disabled={busy || conversationLoading} onClick={() => void loadConversation(conversationId, beforeId)} className="mx-auto mb-5 block min-h-11 rounded-full border bg-white px-4 text-sm"><InterfaceText source="Load earlier messages" /></button>}
          {!messages.length ? <div className="mx-auto flex min-h-full max-w-xl flex-col justify-center py-4"><div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-teal-100 text-teal-800"><MessageCircle size={28} /></div><h2 className="font-serif text-3xl leading-tight text-teal-950"><InterfaceText source="What would you like to explore?" /></h2><p className="mt-3 text-sm leading-7 text-stone-600"><InterfaceText source="Ask about words, traditions, stories or the public collections. Answers include source links when available." /></p><div className="mt-6 grid gap-3 sm:grid-cols-2">{SUGGESTED.slice(0, 2).map(question => <button key={question} type="button" disabled={busy || conversationLoading} onClick={() => { setInput(question); inputRef.current?.focus(); }} className="chat-suggestion"><InterfaceText source={question} /><ArrowUpRight size={16} className="ml-auto shrink-0" /></button>)}</div></div> : <div className="mx-auto max-w-2xl space-y-6">{messages.map((message, index) => <article key={index} className={message.role === "user" ? "flex justify-end" : ""}><div className={message.role === "user" ? "chat-user-message" : "chat-assistant-message"}><p className="whitespace-pre-wrap break-words text-sm leading-7">{message.content}</p></div>{message.role === "assistant" && !!message.sources?.length && <details className="mt-2 text-xs text-teal-900"><summary className="min-h-11 cursor-pointer py-3 font-semibold"><InterfaceText source="Sources" /> ({message.sources.length})</summary><div className="flex flex-wrap gap-2 pb-2">{message.sources.map((source, sourceIndex) => { const href = publicSourceHref(cultureCode, source); return href ? <Link key={`${source.id}:${sourceIndex}`} href={href} className="rounded-lg border border-teal-200 bg-white px-3 py-2">{source.title}</Link> : <span key={`${source.id}:${sourceIndex}`} className="px-3 py-2">{source.title}</span>; })}</div></details>}</article>)}{busy && <p role="status" className="flex items-center gap-2 text-sm text-teal-800"><LoaderCircle size={18} className="animate-spin" /><InterfaceText source="Thinking…" /></p>}</div>}
          {!!mediaPanel.length && <details className="mx-auto mt-6 max-w-2xl rounded-xl border border-teal-200 bg-white p-3"><summary className="min-h-11 cursor-pointer py-3 text-sm font-semibold text-teal-900"><InterfaceText source="Related media" /> ({mediaPanel.length})</summary><div className="grid gap-3 sm:grid-cols-2">{mediaPanel.map((media, index) => <MediaCard key={`${media.recordId}:${index}`} media={media} />)}</div></details>}
        </div>
        <div className="chat-composer shrink-0 border-t px-3 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3 sm:px-6">
          <div className="mx-auto max-w-2xl">
            <details className="mb-2 text-xs text-stone-600"><summary className="w-fit cursor-pointer rounded-lg py-2 font-medium text-teal-900"><InterfaceText source="Chat settings" /></summary><div className="space-y-3 rounded-xl bg-stone-50 p-3">{cultureCode !== "eng" && <label className="flex flex-wrap items-center gap-2"><InterfaceText source="Answer language" /><select value={answerLanguageCode} disabled={busy} onChange={event => setAnswerLanguageCode(event.target.value)} className="min-h-11 rounded-lg border bg-white px-3"><InterfaceOption value={cultureCode}>Community language</InterfaceOption><InterfaceOption value="eng">English</InterfaceOption></select></label>}<p className="leading-6"><InterfaceText source="The configured AI provider processes your question and recent chat messages. Avoid sharing private or sensitive information. AI answers can be mistaken; check the sources." /></p></div></details>
            <label className="mb-3 flex min-h-8 items-start gap-2 text-xs leading-5 text-stone-600"><input type="checkbox" checked={allowExternalAi} onChange={event => setAllowExternalAi(event.target.checked)} disabled={busy} className="mt-1 h-4 w-4 shrink-0 accent-teal-800" /><span><InterfaceText source="Allow AI processing for this chat" /></span></label>
            <form onSubmit={event => { event.preventDefault(); void send(input); }} className="flex items-end gap-2 rounded-2xl border border-stone-300 bg-white p-2 shadow-sm focus-within:border-teal-600 focus-within:ring-2 focus-within:ring-teal-100">
              <InterfaceTextarea ref={inputRef} aria-label="Your question" rows={2} maxLength={2000} value={input} onChange={event => setInput(event.target.value)} onKeyDown={event => { if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) { event.preventDefault(); void send(input); } }} placeholder="Ask a question…" disabled={busy || conversationLoading} className="max-h-36 min-h-12 min-w-0 flex-1 resize-y rounded-xl border-0 bg-transparent px-3 py-2 text-base text-stone-900 outline-none placeholder:text-stone-400 disabled:opacity-50" />
              <InterfaceButton type="submit" aria-label="Send question" title="Send" disabled={busy || conversationLoading || !allowExternalAi || input.trim().length < 2} className="flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-xl bg-teal-800 text-white hover:bg-teal-900 disabled:opacity-40">{busy ? <LoaderCircle size={19} className="animate-spin" /> : <ArrowUp size={20} />}</InterfaceButton>
            </form>
          </div>
        </div>
      </section>
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
      {icon && <span className="w-4 text-center">{icon}</span>}
      <InterfaceText source={label} />
    </button>
  );
}

function MediaCard({ media }: { media: MediaItem }) {
  return (
    <div className="bg-black/5 backdrop-blur-sm rounded-xl border border-stone-900/10 overflow-hidden shadow-xs">
      <div className="bg-stone-900">
        {media.mediaType === "image" && (
          <MediaImage
            src={media.url}
            alt={media.title}
            className="w-full max-h-64 object-cover"
          />
        )}
        {media.mediaType === "video" && (
          <MediaVideo
            src={media.url}
            poster={media.thumbnailUrl || undefined}
            controls
            className="w-full max-h-64"
          />
        )}
        {media.mediaType === "audio" && (
          <div className="p-4">
            <p className="text-xs text-amber-100/70 mb-2"><InterfaceText source="🎵 Audio" /></p>
            <MediaAudio src={media.url} controls className="w-full" />
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
