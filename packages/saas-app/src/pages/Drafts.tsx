import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Layout } from "@/components/layout/Layout";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { FileText, Trash2, ExternalLink, Loader2, Edit, Upload, CheckCircle, Clock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";
import { he } from "date-fns/locale";

interface ArticleDraft {
  id: string;
  source_url: string;
  source_title: string;
  source_image: string | null;
  source_name: string | null;
  hebrew_title: string;
  hebrew_content: string;
  english_title: string;
  english_content: string;
  status: string;
  wordpress_hebrew_url: string | null;
  wordpress_english_url: string | null;
  created_at: string;
  updated_at: string;
}

const statusConfig = {
  draft:             { label: "Draft",           color: "rgb(var(--c-fg-muted))",  bg: "rgb(var(--c-surface-2))" },
  published_hebrew:  { label: "Published (HE)",  color: "rgb(var(--c-green))",      bg: "rgba(52,199,89,0.1)" },
  published_english: { label: "Published (EN)",  color: "rgb(var(--c-primary))",    bg: "rgb(var(--c-primary-dim))" },
  published_both:    { label: "Published (Both)",color: "rgb(var(--c-green))",      bg: "rgba(52,199,89,0.1)" },
};

export default function Drafts() {
  const navigate = useNavigate();
  const [drafts, setDrafts] = useState<ArticleDraft[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => { fetchDrafts(); }, []);

  const fetchDrafts = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("article_drafts")
        .select("*")
        .order("updated_at", { ascending: false });
      if (error) throw error;
      setDrafts((data as ArticleDraft[]) || []);
    } catch (error) {
      console.error("Error fetching drafts:", error);
      toast.error("Error loading drafts");
    } finally { setIsLoading(false); }
  };

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try {
      const { error } = await supabase.from("article_drafts").delete().eq("id", id);
      if (error) throw error;
      setDrafts(drafts.filter((d) => d.id !== id));
      toast.success("Draft deleted");
    } catch (error) {
      console.error("Error deleting draft:", error);
      toast.error("Error deleting draft");
    } finally { setDeletingId(null); }
  };

  const countWords = (text: string) => text.trim().split(/\s+/).filter(Boolean).length;

  const colStyle: React.CSSProperties = {
    padding: "10px 14px",
    fontSize: 10,
    color: "rgb(var(--c-fg-muted))",
    fontWeight: 600,
    letterSpacing: "0.07em",
    textTransform: "uppercase",
    borderBottom: "1px solid rgb(var(--c-border))",
    whiteSpace: "nowrap",
  };

  const cellStyle: React.CSSProperties = {
    padding: "10px 14px",
    borderBottom: "1px solid rgb(var(--c-border-soft))",
    verticalAlign: "top",
  };

  return (
    <Layout>
      <div style={{ padding: "28px 28px 40px" }}>
        {/* ── Header ─────────────────────────── */}
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            marginBottom: 28,
            gap: 16,
          }}
        >
          <div>
            <h1 style={{ color: "rgb(var(--c-fg))", marginBottom: 4 }}>Drafts</h1>
            <p style={{ fontSize: 12, color: "rgb(var(--c-fg-muted))" }}>
              Articles pending publication to WordPress
            </p>
          </div>
          <span
            className="pill pill-muted"
            style={{ fontSize: 12, padding: "4px 10px", alignSelf: "center" }}
          >
            {drafts.length} drafts
          </span>
        </div>

        {/* ── Table ──────────────────────────── */}
        <div
          style={{
            backgroundColor: "rgb(var(--c-surface))",
            border: "1px solid rgb(var(--c-border))",
            borderRadius: "var(--radius)",
            overflow: "hidden",
          }}
        >
          {isLoading ? (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                padding: "64px 0",
              }}
            >
              <Loader2
                size={20}
                style={{ color: "rgb(var(--c-primary))", animation: "spin 1s linear infinite" }}
              />
            </div>
          ) : drafts.length === 0 ? (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                padding: "64px 0",
                gap: 10,
              }}
            >
              <FileText size={32} style={{ color: "rgb(var(--c-fg-muted))", opacity: 0.4 }} />
              <p style={{ fontSize: 13, color: "rgb(var(--c-fg-muted))" }}>No drafts yet</p>
              <p style={{ fontSize: 11, color: "rgb(var(--c-fg-subtle))" }}>
                Create a new article from the daily digest
              </p>
            </div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ backgroundColor: "rgb(var(--c-surface-2))" }}>
                    <th style={{ ...colStyle, width: 48 }}></th>
                    <th style={colStyle}>Title</th>
                    <th style={{ ...colStyle, textAlign: "center", width: 110 }}>Words</th>
                    <th style={{ ...colStyle, textAlign: "center", width: 130 }}>Status</th>
                    <th style={{ ...colStyle, textAlign: "center", width: 100 }}>Updated</th>
                    <th style={{ ...colStyle, textAlign: "right", width: 100 }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {drafts.map((draft) => {
                    const status =
                      statusConfig[draft.status as keyof typeof statusConfig] || statusConfig.draft;
                    const heW = countWords(draft.hebrew_content);
                    const enW = countWords(draft.english_content);
                    const heOk = heW >= 300 && heW <= 500;
                    const enOk = enW >= 300 && enW <= 500;

                    return (
                      <tr
                        key={draft.id}
                        style={{ transition: "background-color 100ms ease" }}
                        onMouseEnter={(e) => {
                          (e.currentTarget as HTMLTableRowElement).style.backgroundColor =
                            "rgb(var(--c-surface-2))";
                        }}
                        onMouseLeave={(e) => {
                          (e.currentTarget as HTMLTableRowElement).style.backgroundColor =
                            "transparent";
                        }}
                      >
                        {/* Image */}
                        <td style={{ ...cellStyle, padding: "10px 14px" }}>
                          {draft.source_image ? (
                            <img
                              src={draft.source_image}
                              alt=""
                              style={{
                                width: 36,
                                height: 36,
                                objectFit: "cover",
                                borderRadius: 4,
                                border: "1px solid rgb(var(--c-border))",
                                display: "block",
                              }}
                            />
                          ) : (
                            <div
                              style={{
                                width: 36,
                                height: 36,
                                borderRadius: 4,
                                backgroundColor: "rgb(var(--c-surface-2))",
                                border: "1px solid rgb(var(--c-border))",
                              }}
                            />
                          )}
                        </td>

                        {/* Title */}
                        <td style={cellStyle}>
                          <p
                            style={{
                              fontSize: 13,
                              fontWeight: 600,
                              color: "rgb(var(--c-fg))",
                              direction: "rtl",
                              lineHeight: 1.4,
                              margin: "0 0 2px",
                              overflow: "hidden",
                              display: "-webkit-box",
                              WebkitLineClamp: 1,
                              WebkitBoxOrient: "vertical",
                            }}
                          >
                            {draft.hebrew_title}
                          </p>
                          <p
                            style={{
                              fontSize: 11,
                              color: "rgb(var(--c-fg-muted))",
                              margin: "0 0 6px",
                              overflow: "hidden",
                              display: "-webkit-box",
                              WebkitLineClamp: 1,
                              WebkitBoxOrient: "vertical",
                            }}
                          >
                            {draft.english_title}
                          </p>
                          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                            {draft.source_name && (
                              <span
                                className="pill pill-muted"
                                style={{ fontSize: 10 }}
                              >
                                {draft.source_name}
                              </span>
                            )}
                            <a
                              href={draft.source_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              style={{ color: "rgb(var(--c-primary))", lineHeight: 1 }}
                            >
                              <ExternalLink size={11} />
                            </a>
                          </div>
                        </td>

                        {/* Words */}
                        <td style={{ ...cellStyle, textAlign: "center" }}>
                          <div style={{ display: "flex", flexDirection: "column", gap: 4, alignItems: "center" }}>
                            <span
                              className="pill"
                              style={
                                heOk
                                  ? { backgroundColor: "rgba(52,199,89,0.1)", color: "rgb(var(--c-green))", fontSize: 10 }
                                  : { backgroundColor: "rgb(var(--c-surface-2))", color: "rgb(var(--c-fg-muted))", fontSize: 10 }
                              }
                            >
                              HE {heW}
                            </span>
                            <span
                              className="pill"
                              style={
                                enOk
                                  ? { backgroundColor: "rgba(52,199,89,0.1)", color: "rgb(var(--c-green))", fontSize: 10 }
                                  : { backgroundColor: "rgb(var(--c-surface-2))", color: "rgb(var(--c-fg-muted))", fontSize: 10 }
                              }
                            >
                              EN {enW}
                            </span>
                          </div>
                        </td>

                        {/* Status */}
                        <td style={{ ...cellStyle, textAlign: "center" }}>
                          <span
                            className="pill"
                            style={{ backgroundColor: status.bg, color: status.color, fontSize: 10 }}
                          >
                            {status.label}
                          </span>
                        </td>

                        {/* Updated */}
                        <td style={{ ...cellStyle, textAlign: "center" }}>
                          <span
                            className="data-value"
                            style={{ fontSize: 11, color: "rgb(var(--c-fg-muted))" }}
                          >
                            {format(new Date(draft.updated_at), "dd/MM HH:mm", { locale: he })}
                          </span>
                        </td>

                        {/* Actions */}
                        <td style={{ ...cellStyle, textAlign: "right" }}>
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "flex-end",
                              gap: 2,
                            }}
                          >
                            <IconBtn title="Edit" onClick={() => navigate(`/generate?draft=${draft.id}`)}>
                              <Edit size={13} />
                            </IconBtn>

                            {draft.wordpress_hebrew_url && (
                              <a
                                href={draft.wordpress_hebrew_url}
                                target="_blank"
                                rel="noopener noreferrer"
                              >
                                <IconBtn title="Open in WordPress (HE)">
                                  <Upload size={13} style={{ color: "rgb(var(--c-primary))" }} />
                                </IconBtn>
                              </a>
                            )}

                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <IconBtn
                                  title="Delete"
                                  disabled={deletingId === draft.id}
                                >
                                  {deletingId === draft.id ? (
                                    <Loader2
                                      size={13}
                                      style={{ animation: "spin 1s linear infinite" }}
                                    />
                                  ) : (
                                    <Trash2 size={13} style={{ color: "rgb(var(--c-red))" }} />
                                  )}
                                </IconBtn>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Delete Draft</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Delete "{draft.hebrew_title}"? This cannot be undone.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => handleDelete(draft.id)}
                                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                  >
                                    Delete
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}

function IconBtn({
  children,
  title,
  onClick,
  disabled,
}: {
  children: React.ReactNode;
  title?: string;
  onClick?: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      title={title}
      onClick={onClick}
      disabled={disabled}
      style={{
        background: "none",
        border: "none",
        cursor: disabled ? "not-allowed" : "pointer",
        color: "rgb(var(--c-fg-muted))",
        padding: "5px",
        borderRadius: 4,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        opacity: disabled ? 0.4 : 1,
        transition: "background-color 100ms ease",
      }}
      onMouseEnter={(e) => {
        if (!disabled)
          (e.currentTarget as HTMLButtonElement).style.backgroundColor =
            "rgb(var(--c-surface-2))";
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLButtonElement).style.backgroundColor = "transparent";
      }}
    >
      {children}
    </button>
  );
}
