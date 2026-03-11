import { useState, useEffect, useRef, useCallback } from "react";
import { X, Send, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { ChatMessageBubble } from "./ChatMessageBubble";
import { TopicSelector } from "./TopicSelector";
import { NewsletterForm } from "./NewsletterForm";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import type { ChatMessage, ChatLanguage, ChatArticle } from "./types";

function getOrCreateSessionId(): string {
  const key = "autopilot_chat_session";
  let id = localStorage.getItem(key);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(key, id);
  }
  return id;
}

function detectLanguage(): ChatLanguage {
  const lang = navigator.language?.toLowerCase() || "";
  return lang.startsWith("he") ? "he" : "en";
}

interface ChatWindowProps {
  onClose: () => void;
}

export function ChatWindow({ onClose }: ChatWindowProps) {
  const { config } = useWorkspace();
  const [language] = useState<ChatLanguage>(detectLanguage);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showTopics, setShowTopics] = useState(true);
  const [showSubscribeForm, setShowSubscribeForm] = useState(false);
  const [detectedInterests, setDetectedInterests] = useState<string[]>([]);
  const [messageCount, setMessageCount] = useState(0);

  const sessionId = useRef(getOrCreateSessionId());
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const conversationHistoryRef = useRef<Array<{ role: "user" | "assistant"; content: string }>>([]);

  const isHebrew = language === "he";

  // Greeting from workspace config, with fallback
  const greeting =
    isHebrew
      ? config.chatbot_greeting?.he || `שלום! אני העוזר של ${config.brand_name} 👋\n\nאיך אוכל לעזור לך?`
      : config.chatbot_greeting?.en || `Hello! I'm the ${config.brand_name} Assistant 👋\n\nHow can I help you?`;

  useEffect(() => {
    setMessages([
      { id: "greeting", role: "assistant", content: greeting, timestamp: new Date() },
    ]);
  }, [greeting]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, showSubscribeForm]);

  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 100);
  }, []);

  const sendMessage = useCallback(async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || isLoading) return;

    setInput("");
    setShowTopics(false);

    const userMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content: trimmed,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);

    const newCount = messageCount + 1;
    setMessageCount(newCount);

    conversationHistoryRef.current = [
      ...conversationHistoryRef.current,
      { role: "user" as const, content: trimmed },
    ].slice(-10);

    setIsLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke("chatbot-query", {
        body: {
          message: trimmed,
          sessionId: sessionId.current,
          language,
          messageCount: newCount,
          conversationHistory: conversationHistoryRef.current.slice(0, -1),
        },
      });

      if (error || !data?.success) {
        const rawError = error ? (error.message || JSON.stringify(error)) : (data?.error ? JSON.stringify(data.error) : "Unknown error");
        const rateLimitMsg = data?.reply;
        setMessages((prev) => [
          ...prev,
          {
            id: crypto.randomUUID(),
            role: "assistant",
            content: rateLimitMsg || (isHebrew ? `מצטער, אירעה שגיאה. נסה שוב.\n(${rawError})` : `Sorry, an error occurred. Please try again.\n(${rawError})`),
            timestamp: new Date(),
          },
        ]);
        return;
      }

      const assistantContent: string = data.reply || "";
      const articles: ChatArticle[] = data.articles || [];

      if (data.detectedTopics?.length > 0) {
        setDetectedInterests((prev) => [...new Set([...prev, ...data.detectedTopics])].slice(0, 10));
      }

      conversationHistoryRef.current = [
        ...conversationHistoryRef.current,
        { role: "assistant" as const, content: assistantContent },
      ].slice(-10);

      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          content: assistantContent,
          articles: articles.length > 0 ? articles : undefined,
          timestamp: new Date(),
        },
      ]);

      if (data.showSubscribeForm) setShowSubscribeForm(true);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          content: isHebrew ? "מצטער, אירעה שגיאה בחיבור. נסה שוב." : "Sorry, a connection error occurred. Please try again.",
          timestamp: new Date(),
        },
      ]);
    } finally {
      setIsLoading(false);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isLoading, language, messageCount, isHebrew]);

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  }

  function handleSubscribeSuccess(message: string) {
    setShowSubscribeForm(false);
    setMessages((prev) => [
      ...prev,
      { id: crypto.randomUUID(), role: "assistant", content: message, timestamp: new Date() },
    ]);
  }

  // Brand initial for avatar
  const brandInitial = (config.brand_name?.[0] ?? "A").toUpperCase();

  return (
    <div
      className="flex flex-col bg-background border border-white/10 rounded-2xl shadow-2xl overflow-hidden"
      style={{ width: 360, height: 520 }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 bg-surface-elevated/50 shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="relative">
            {config.brand_logo_url ? (
              <img
                src={config.brand_logo_url}
                alt={config.brand_name}
                className="w-8 h-8 rounded-full object-cover border"
                style={{ borderColor: "var(--brand-primary)" }}
              />
            ) : (
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold text-white"
                style={{ background: "color-mix(in srgb, var(--brand-primary) 20%, transparent)", border: "1px solid color-mix(in srgb, var(--brand-primary) 40%, transparent)", color: "var(--brand-primary)" }}
              >
                {brandInitial}
              </div>
            )}
            <span
              className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-background"
              style={{ backgroundColor: "var(--brand-primary)" }}
            />
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground leading-tight">
              {config.brand_name} Assistant
            </p>
            <p className="text-xs leading-tight" style={{ color: "color-mix(in srgb, var(--brand-primary) 80%, transparent)" }}>
              {isHebrew ? "מחובר" : "Online"}
            </p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="w-7 h-7 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-white/10 transition-colors"
          aria-label="Close chat"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3 scrollbar-thin scrollbar-thumb-white/10">
        {messages.map((msg) => (
          <ChatMessageBubble key={msg.id} message={msg} language={language} />
        ))}

        {showTopics && messages.length === 1 && (
          <div className="pl-9">
            <TopicSelector language={language} onSelect={sendMessage} />
          </div>
        )}

        {isLoading && (
          <div className="flex items-center gap-2 pl-9">
            <div className="flex gap-1 px-3 py-2 rounded-2xl rounded-tl-sm bg-white/5 border border-white/10">
              <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/60 animate-bounce" style={{ animationDelay: "0ms" }} />
              <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/60 animate-bounce" style={{ animationDelay: "150ms" }} />
              <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/60 animate-bounce" style={{ animationDelay: "300ms" }} />
            </div>
          </div>
        )}

        {showSubscribeForm && !isLoading && (
          <div className="pl-9">
            <NewsletterForm
              language={language}
              sessionId={sessionId.current}
              interests={detectedInterests}
              onSuccess={handleSubscribeSuccess}
            />
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="px-3 py-2.5 border-t border-white/10 shrink-0">
        <div
          className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-xl px-3 py-1.5 transition-colors"
          style={{ "--tw-ring-color": "var(--brand-primary)" } as React.CSSProperties}
        >
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={isHebrew ? "שאל שאלה..." : "Ask a question..."}
            maxLength={500}
            dir={isHebrew ? "rtl" : "ltr"}
            disabled={isLoading}
            className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none disabled:opacity-50"
          />
          <button
            onClick={() => sendMessage(input)}
            disabled={!input.trim() || isLoading}
            className="w-7 h-7 rounded-lg flex items-center justify-center border transition-colors disabled:opacity-30 disabled:cursor-not-allowed shrink-0"
            style={{
              background: "color-mix(in srgb, var(--brand-primary) 20%, transparent)",
              borderColor: "color-mix(in srgb, var(--brand-primary) 30%, transparent)",
              color: "var(--brand-primary)",
            }}
            aria-label="Send"
          >
            {isLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
          </button>
        </div>
        <p className="text-[10px] text-muted-foreground/30 text-center mt-1.5">
          {config.brand_name}
        </p>
      </div>
    </div>
  );
}
