"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { signOut } from "next-auth/react";
import { toast } from "sonner";
import { BackLink } from "@/components/layout/back-link";

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

export function ChatInterface({ languageCode = "luo", cultureCode = languageCode }: { languageCode?: string; cultureCode?: string }) {
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

  // If session is stale, force sign out
  const handleStale = useCallback(async () => {
    toast.error("Your session expired. Signing you out...");
    setTimeout(() => signOut({ callbackUrl: "/" }), 1200);
  }, []);

  const loadConversations = useCallback(async () => {
    try {
      const url = `/api/conversations${showArchived ? "?archived=true" : ""}`;
      const res = await fetch(url);
      const json = await res.json();
      if (json.code === "STALE_SESSION") {
        handleStale();
        return;
      }
      if (json.success) setConversations(json.data);
    } catch {}
  }, [showArchived, handleStale]);

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

  async function loadConversation(id: string) {
    try {
      const res = await fetch(`/api/conversations/${id}`);
      const json = await res.json();
      if (!json.success) return;

      const loaded: Message[] = [];
      for (const m of json.data.messages) {
        loaded.push({ role: "user", content: m.query });
        loaded.push({
          role: "assistant",
          content: m.response,
          sources: m.sources ?? [],
        });
      }
      setMessages(loaded);
      setConversationId(id);
      setMediaPanel([]);
      setSidebarOpen(false);
      setOpenMenuId(null);
    } catch {
      toast.error("Failed to load conversation");
    }
  }

  async function patchConversation(id: string, payload: any) {
    try {
      const res = await fetch(`/api/conversations/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error();
      return true;
    } catch {
      toast.error("Failed");
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
      toast.success("Renamed");
    }
    setOpenMenuId(null);
  }

  async function handlePin(id: string, pinned: boolean) {
    if (await patchConversation(id, { pinned: !pinned })) {
      toast.success(pinned ? "Unpinned" : "Pinned");
      loadConversations();
    }
    setOpenMenuId(null);
  }

  async function handleArchive(id: string, archived: boolean) {
    if (await patchConversation(id, { archived: !archived })) {
      toast.success(archived ? "Unarchived" : "Archived");
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
      await fetch(`/api/conversations/${id}`, { method: "DELETE" });
      setConversations((c) => c.filter((x) => x.id !== id));
      if (conversationId === id) {
        setConversationId(null);
        setMessages([]);
        setMediaPanel([]);
      }
      toast.success("Deleted");
    } catch {
      toast.error("Failed to delete");
    }
    setOpenMenuId(null);
  }

  function startNewChat() {
    setConversationId(null);
    setMessages([]);
    setMediaPanel([]);
    setInput("");
    setSidebarOpen(false);
  }

  async function send(question: string) {
    if (!question.trim() || busy) return;

    const userMessage: Message = { role: "user", content: question };
    setMessages((m) => [...m, userMessage]);
    setInput("");
    setMediaPanel([]);
    setBusy(true);

    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question, languageCode: answerLanguageCode, cultureCode, conversationId }),
      });

      const json = await res.json();

      if (json.code === "STALE_SESSION") {
        handleStale();
        return;
      }

      if (!json.success) throw new Error(json.error || "Failed");

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
      toast.error(err.message || "Chat failed");
      setMessages((m) => [
        ...m,
        {
          role: "assistant",
          content: "Sorry, something went wrong. Please try again in a moment.",
        },
      ]);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="h-[calc(100vh-4rem)] flex bg-[#b89a68] relative overflow-hidden">
      <aside
        className={`${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        } md:translate-x-0 absolute md:relative inset-y-0 left-0 z-30 w-72 bg-[#6b4724] border-r border-black/20 transition-transform flex flex-col`}
      >
        <div className="p-3 border-b border-amber-100/15 space-y-2">
          <div className="md:hidden mb-2">
            <BackLink href="/dashboard" label="Back" variant="on-dark" />
          </div>
          <button
            onClick={startNewChat}
            className="w-full flex items-center justify-center gap-2 bg-amber-400 text-stone-900 py-2.5 rounded-full font-semibold text-sm hover:bg-amber-300 transition shadow"
          >
            <span className="text-base">+</span> New chat
          </button>
          <button
            onClick={() => setShowArchived(!showArchived)}
            className="w-full text-[11px] uppercase tracking-wider text-amber-100/60 hover:text-amber-50 py-1 transition"
          >
            {showArchived ? "← Back to chats" : "View archived"}
          </button>
        </div>

        <div className="flex-1 overflow-y-auto py-2">
          {conversations.length === 0 ? (
            <p className="text-xs text-amber-100/50 px-4 py-3">
              {showArchived ? "No archived chats" : "No chats yet"}
            </p>
          ) : (
            conversations.map((c) => (
              <div
                key={c.id}
                className={`group relative px-4 py-2.5 cursor-pointer flex items-center gap-2 hover:bg-black/20 ${
                  conversationId === c.id ? "bg-black/25" : ""
                }`}
                onClick={() => loadConversation(c.id)}
              >
                {c.pinned && (
                  <span className="text-amber-300 text-xs flex-shrink-0">📌</span>
                )}
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-amber-50 truncate leading-tight">
                    {c.title}
                  </p>
                  <p className="text-[10px] text-amber-200/50 mt-0.5">
                    {c.messageCount} message{c.messageCount === 1 ? "" : "s"}
                  </p>
                </div>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setOpenMenuId(openMenuId === c.id ? null : c.id);
                  }}
                  className="opacity-0 group-hover:opacity-100 text-amber-100/70 hover:text-amber-50 transition px-1"
                  title="Options"
                >
                  ⋯
                </button>

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

        <div className="p-3 border-t border-amber-100/15 text-[10px] text-amber-100/40 text-center tracking-widest">
          JOOUST · NRF
        </div>
      </aside>

      {sidebarOpen && (
        <div
          className="md:hidden fixed inset-0 bg-black/50 z-20"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <div className="flex-1 min-w-0 flex flex-col">
        <header className="flex items-center justify-between px-4 py-3 border-b border-stone-900/15 bg-[#a9895a]">
          <div className="flex items-center gap-2 md:gap-3">
            <div className="hidden md:block">
              <BackLink href="/dashboard" label="Back" variant="on-sand" />
            </div>
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="md:hidden text-stone-900 text-2xl leading-none"
              aria-label="Menu"
            >
              ☰
            </button>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-500 to-amber-700 flex items-center justify-center">
                <span className="text-white text-sm">💬</span>
              </div>
            <div>
                <h1 className="font-serif text-base md:text-lg text-stone-900 leading-tight">
                  Chat with Luo Lingua
                </h1>
                <p className="text-[10px] uppercase tracking-widest text-stone-800/60 hidden sm:block">
                  AI Cultural Assistant
                </p>
              </div>
            </div>
            </div>
            {cultureCode !== "eng" && <label className="text-xs font-semibold text-stone-800">Answer language <select value={answerLanguageCode} onChange={(event) => setAnswerLanguageCode(event.target.value)} className="ml-2 rounded-md border border-stone-800/20 bg-white/70 px-2 py-1"><option value={cultureCode}>Original language</option><option value="eng">English — {cultureCode} culture</option></select></label>}
        </header>

        <div className="flex-1 flex min-h-0">
          <div
            ref={scrollRef}
            className="flex-1 overflow-y-auto overscroll-contain px-4 md:px-8 py-6"
          >
            {messages.length === 0 ? (
              <div className="max-w-2xl mx-auto text-center pt-8">
                <div className="text-5xl mb-4">💬</div>
                <h2 className="text-2xl font-serif text-stone-900 mb-2">
                  Ask about Luo Culture
                </h2>
                <p className="text-sm text-stone-800/70 mb-8">
                  I answer questions using our curated cultural knowledge base.
                  Ask for videos, images, audio, or specific topics.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {SUGGESTED.map((q) => (
                    <button
                      key={q}
                      onClick={() => send(q)}
                      className="text-left p-4 bg-black/5 hover:bg-black/10 border border-stone-900/15 hover:border-amber-800/50 rounded-xl text-sm text-stone-900 transition shadow-sm"
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
                        <div className="max-w-md bg-stone-900 text-amber-50 rounded-2xl rounded-tr-sm px-4 py-2.5 shadow">
                          <p className="text-sm whitespace-pre-line">
                            {m.content}
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div className="flex justify-start">
                        <div className="max-w-xl">
                          <div className="bg-black/5 backdrop-blur rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm border border-stone-900/10">
                            <p className="text-sm text-stone-900 whitespace-pre-line leading-relaxed">
                              {m.content}
                            </p>
                          </div>
                          {m.sources && m.sources.length > 0 && (
                            <div className="mt-2 flex flex-wrap gap-2">
                              {m.sources.map((s, j) => (
                                <span
                                  key={j}
                                  className="text-xs px-2 py-1 bg-black/5 text-amber-900 border border-amber-800/20 rounded-full"
                                  title={`Similarity: ${s.similarity}`}
                                >
                                  [{j + 1}] {s.title.slice(0, 40)}
                                  {s.title.length > 40 ? "…" : ""}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
                {busy && (
                  <div className="flex justify-start">
                    <div className="bg-black/5 rounded-2xl px-4 py-3 shadow-sm">
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
            <div className="hidden lg:flex w-80 border-l border-stone-900/15 bg-[#a9895a] flex-col">
              <div className="px-4 py-3 border-b border-stone-900/15 flex items-center justify-between">
                <div>
                  <p className="text-[10px] uppercase tracking-widest text-stone-800/60">
                    Results
                  </p>
                  <p className="font-serif text-base text-stone-900">
                    {mediaPanel.length} item{mediaPanel.length === 1 ? "" : "s"}
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
          <form
            onSubmit={(e) => {
              e.preventDefault();
              send(input);
            }}
            className="max-w-2xl mx-auto flex gap-2"
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about Luo culture, songs, artifact videos..."
              disabled={busy}
              className="flex-1 px-4 py-3 bg-white border border-stone-900/20 rounded-full focus:outline-none focus:ring-2 focus:ring-amber-800 text-sm text-stone-900 placeholder:text-stone-800/40 disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={busy || !input.trim()}
              className="px-6 py-3 bg-stone-900 text-amber-50 rounded-full text-sm font-semibold hover:bg-amber-900 disabled:opacity-40 transition shadow"
            >
              Send
            </button>
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
    <div className="bg-black/5 backdrop-blur rounded-xl border border-stone-900/10 overflow-hidden shadow-sm">
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
            <p className="text-xs text-amber-100/70 mb-2">🎵 Audio</p>
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
