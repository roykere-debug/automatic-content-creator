import { useWorkspace } from "@/contexts/WorkspaceContext";

type ChatLanguage = "he" | "en";

interface TopicSelectorProps {
  language: ChatLanguage;
  onSelect: (message: string) => void;
}

/**
 * Generalized TopicSelector — reads topics from workspace_settings.chatbot_topics.
 * No hardcoded defense-tech topics.
 */
export function TopicSelector({ language, onSelect }: TopicSelectorProps) {
  const { config } = useWorkspace();
  const isHebrew = language === "he";

  const topics = config.chatbot_topics.length > 0 ? config.chatbot_topics : [];

  if (topics.length === 0) return null;

  return (
    <div className="mt-2 mb-1">
      <p className="text-xs text-muted-foreground mb-2 px-1">
        {isHebrew ? "בחר נושא שמעניין אותך:" : "Select a topic you're interested in:"}
      </p>
      <div className="flex flex-wrap gap-1.5">
        {topics.map((topic) => (
          <button
            key={topic.key}
            onClick={() => onSelect(isHebrew ? topic.labelHe : topic.labelEn)}
            className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium
              bg-white/5 border border-white/15 text-foreground/80
              hover:bg-[var(--brand-primary)]/10 hover:border-[var(--brand-primary)]/50 hover:text-[var(--brand-primary)]
              transition-all duration-150 cursor-pointer"
          >
            <span>{topic.emoji}</span>
            <span>{isHebrew ? topic.labelHe : topic.labelEn}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
