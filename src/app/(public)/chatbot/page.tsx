import { ChatInterface } from "@/components/ai/chat-interface";

export default function ChatbotPage() {
  return (
    <div className="min-h-screen bg-stone-50 py-8 px-4">
      <div className="max-w-3xl mx-auto mb-6">
        <h1 className="text-3xl font-serif text-stone-800 mb-1">
          Cultural Assistant
        </h1>
        <p className="text-sm text-stone-500">
          Ask questions about Luo language, proverbs, traditions, and history
        </p>
      </div>
      <ChatInterface />
    </div>
  );
}