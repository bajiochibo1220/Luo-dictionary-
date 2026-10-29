"use client";
import { MessageCircle } from "lucide-react";
import { InterfaceText } from "./interface-language";

export function ChatbotShortcut({ href = "/chatbot" }: { href?: string }) {
  return <a href={href} className="floating-chatbot group fixed bottom-4 right-4 z-[35] flex h-12 w-12 items-center justify-center rounded-full bg-amber-600 text-white shadow-xl focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-teal-700" aria-label="Open CULTURAL HERITAGE">
    <MessageCircle size={24} aria-hidden="true" />
    <span className="pointer-events-none absolute right-14 whitespace-nowrap rounded-lg bg-stone-900 px-3 py-2 text-xs text-white opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100"><InterfaceText source="CULTURAL HERITAGE" /></span>
  </a>;
}
