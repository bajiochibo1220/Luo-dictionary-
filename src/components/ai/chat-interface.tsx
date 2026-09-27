"use client";

import { useState, useRef, useEffect } from "react";
import { toast } from "sonner";

type Source = {
  id: string;
  title: string;
  module: string;
  similarity: number;
};

type Message = {
  role: "user" | "assistant";
  content: string;
  sources?: Source[];
};

const SUGGESTED = [
  "What are Luo marriage customs?",
  "Explain the proverb 'Ng'ato ok nyal timo gima ok onyal'",
  "What does nyathi mean?",
  "Tell me about Luo naming traditions",
];

export function ChatInterface() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages]);

  async function send(question: string) {
    if (!question.trim() || busy) return;

    const userMessage: Message = { role: "user", content: question };
    setMessages((m) => [...m, userMessage]);
    setInput("");
    setBusy(true);

    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question }),
      });

      const json = await res.json();

      if (!json.success) {
        throw new Error(json.error || "Failed");
      }

      setMessages((m) => [
        ...m,
        {
          role: "assistant",
          content: json.data.answer,
          sources: json.data.sources,
        },
      ]);
    } catch (err: any) {
      toast.error(err.message || "Chat failed");
      setMessages((m) => [
        ...m,
        {
          role: "assistant",
          content:
            "Sorry, something went wrong. Please try again in a moment.",
        },
      ]);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="max-w-3xl mx-auto">
      <div className="bg-white rounded-2xl shadow-sm border border-stone-100 flex flex-col h-[70vh]">
        {/* Messages */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-6">
          {messages.length === 0 ? (
            <div className="text-center pt-12">
              <div className="text-5xl mb-4">💬</div>
              <h2 className="text-2xl font-serif text-stone-800 mb-2">
                Ask about Luo Culture
              </h2>
              <p className="text-sm text-stone-500 mb-8">
                I answer questions using our curated cultural knowledge base.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-w-lg mx-auto">
                {SUGGESTED.map((q) => (
                  <button
                    key={q}
                    onClick={() => send(q)}
                    className="text-left p-3 bg-stone-50 hover:bg-amber-50 border border-stone-200 hover:border-amber-300 rounded-lg text-sm text-stone-700 transition"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {messages.map((m, i) => (
                <div key={i}>
                  {m.role === "user" ? (
                    <div className="flex justify-end">
                      <div className="max-w-md bg-amber-600 text-white rounded-2xl rounded-tr-sm px-4 py-2.5">
                        <p className="text-sm">{m.content}</p>
                      </div>
                    </div>
                  ) : (
                    <div className="flex justify-start">
                      <div className="max-w-2xl">
                        <div className="bg-stone-100 rounded-2xl rounded-tl-sm px-4 py-3">
                          <p className="text-sm text-stone-800 whitespace-pre-line leading-relaxed">
                            {m.content}
                          </p>
                        </div>
                        {m.sources && m.sources.length > 0 && (
                          <div className="mt-2 flex flex-wrap gap-2">
                            {m.sources.map((s, j) => (
                              <span
                                key={j}
                                className="text-xs px-2 py-1 bg-amber-50 text-amber-700 border border-amber-100 rounded-full"
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
                  <div className="bg-stone-100 rounded-2xl rounded-tl-sm px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 bg-amber-500 rounded-full animate-bounce" />
                      <span
                        className="w-2 h-2 bg-amber-500 rounded-full animate-bounce"
                        style={{ animationDelay: "0.15s" }}
                      />
                      <span
                        className="w-2 h-2 bg-amber-500 rounded-full animate-bounce"
                        style={{ animationDelay: "0.3s" }}
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Input */}
        <div className="border-t border-stone-100 p-4">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              send(input);
            }}
            className="flex gap-2"
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about Luo culture, language, proverbs..."
              disabled={busy}
              className="flex-1 px-4 py-2.5 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 text-sm disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={busy || !input.trim()}
              className="px-5 py-2.5 bg-amber-600 text-white rounded-lg text-sm font-medium hover:bg-amber-700 disabled:opacity-50"
            >
              Send
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}