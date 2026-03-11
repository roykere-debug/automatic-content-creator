import { useState } from "react";
import { Loader2, CheckCircle2, Mail } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { ChatLanguage } from "./types";

interface NewsletterFormProps {
  language: ChatLanguage;
  sessionId: string;
  interests: string[];
  onSuccess: (message: string) => void;
}

export function NewsletterForm({ language, sessionId, interests, onSuccess }: NewsletterFormProps) {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const isHebrew = language === "he";

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    // Honeypot check (handled server-side, but also client-side)
    const honeypot = (e.target as HTMLFormElement).querySelector<HTMLInputElement>('[name="website"]');
    if (honeypot?.value) return;

    if (!emailRegex.test(email)) {
      setError(isHebrew ? "כתובת מייל לא תקינה" : "Invalid email address");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke("chatbot-subscribe", {
        body: {
          email: email.trim().toLowerCase(),
          name: name.trim() || undefined,
          interests,
          sessionId,
          language,
        },
      });

      if (fnError || !data?.success) {
        const msg = data?.message || (isHebrew ? "אירעה שגיאה. נסה שוב." : "An error occurred. Please try again.");
        setError(msg);
        return;
      }

      setSubmitted(true);
      onSuccess(data.message);
    } catch {
      setError(isHebrew ? "אירעה שגיאה. נסה שוב." : "An error occurred. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }

  if (submitted) {
    return (
      <div className="flex items-center gap-2 p-3 rounded-lg bg-tactical-green/10 border border-tactical-green/30">
        <CheckCircle2 className="w-4 h-4 text-tactical-green shrink-0" />
        <p className="text-sm text-tactical-green font-medium">
          {isHebrew ? "נרשמת בהצלחה! 🎉" : "Successfully subscribed! 🎉"}
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-tactical-green/20 bg-tactical-green/5 p-3 mt-1">
      <div className="flex items-center gap-1.5 mb-2.5">
        <Mail className="w-3.5 h-3.5 text-tactical-green" />
        <p className="text-xs font-semibold text-tactical-green">
          {isHebrew ? "הירשם לניוזלטר החינמי" : "Subscribe to the free newsletter"}
        </p>
      </div>

      <form onSubmit={handleSubmit} noValidate dir={isHebrew ? "rtl" : "ltr"}>
        {/* Honeypot — hidden from real users */}
        <input
          name="website"
          type="text"
          tabIndex={-1}
          autoComplete="off"
          style={{ position: "absolute", opacity: 0, height: 0, width: 0, pointerEvents: "none" }}
        />

        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={isHebrew ? "שם (אופציונלי)" : "Name (optional)"}
          maxLength={100}
          className="w-full mb-2 px-3 py-1.5 rounded-md bg-background/80 border border-white/15
            text-sm placeholder:text-muted-foreground/50 focus:outline-none focus:border-tactical-green/50
            transition-colors"
        />

        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder={isHebrew ? "כתובת מייל *" : "Email address *"}
          required
          maxLength={254}
          dir="ltr"
          className="w-full mb-2 px-3 py-1.5 rounded-md bg-background/80 border border-white/15
            text-sm placeholder:text-muted-foreground/50 focus:outline-none focus:border-tactical-green/50
            transition-colors"
        />

        {error && (
          <p className="text-xs text-red-400 mb-2">{error}</p>
        )}

        <button
          type="submit"
          disabled={isLoading || !email}
          className="w-full flex items-center justify-center gap-2 px-3 py-1.5 rounded-md
            bg-tactical-green/20 hover:bg-tactical-green/30 border border-tactical-green/40
            text-sm font-medium text-tactical-green transition-colors
            disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              {isHebrew ? "שולח..." : "Submitting..."}
            </>
          ) : (
            isHebrew ? "הירשם" : "Subscribe"
          )}
        </button>
      </form>
    </div>
  );
}
