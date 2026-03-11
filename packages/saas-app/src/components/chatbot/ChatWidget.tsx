import { useState, useEffect } from "react";
import { MessageCircle, X } from "lucide-react";
import { ChatWindow } from "./ChatWindow";

const isInIframe = typeof window !== "undefined" && window.self !== window.top;

export function ChatWidget() {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (!isInIframe) return;
    try {
      window.parent.postMessage(isOpen ? "autopilot-chat:open" : "autopilot-chat:close", "*");
    } catch {
      // Cross-origin — silently ignore
    }
  }, [isOpen]);

  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col items-end gap-3">
      {isOpen && (
        <div className="animate-fade-in" style={{ transformOrigin: "bottom right" }}>
          <ChatWindow onClose={() => setIsOpen(false)} />
        </div>
      )}

      <button
        onClick={() => setIsOpen((prev) => !prev)}
        className="relative w-14 h-14 rounded-full flex items-center justify-center shadow-lg
          transition-all duration-200 hover:scale-105 active:scale-95"
        style={{
          background: "color-mix(in srgb, var(--brand-primary) 20%, transparent)",
          border: "2px solid color-mix(in srgb, var(--brand-primary) 50%, transparent)",
          color: "var(--brand-primary)",
        }}
        aria-label={isOpen ? "Close chat" : "Open chat assistant"}
      >
        {!isOpen && (
          <span
            className="absolute top-1 right-1 w-3 h-3 rounded-full border-2 border-background animate-pulse"
            style={{ backgroundColor: "var(--brand-primary)" }}
          />
        )}
        {isOpen ? <X className="w-6 h-6" /> : <MessageCircle className="w-6 h-6" />}
      </button>
    </div>
  );
}
