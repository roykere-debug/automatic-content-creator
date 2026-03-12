import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { Loader2, Zap } from "lucide-react";
import { useWorkspace } from "@/contexts/WorkspaceContext";

type Mode = "signin" | "signup";

export default function Auth() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [mode, setMode] = useState<Mode>("signin");
  const { signIn, signUp } = useAuth();
  const { config } = useWorkspace();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    if (mode === "signin") {
      const { error } = await signIn(email, password);
      if (error) toast.error(error.message);
      else { toast.success("Signed in"); navigate("/"); }
    } else {
      const { error } = await signUp(email, password);
      if (error) toast.error(error.message);
      else { toast.success("Account created!"); navigate("/"); }
    }
    setIsLoading(false);
  };

  const inputStyle: React.CSSProperties = {
    width: "100%",
    padding: "10px 12px",
    backgroundColor: "rgb(var(--c-surface-2))",
    border: "1px solid rgb(var(--c-border))",
    borderRadius: "calc(var(--radius) - 2px)",
    fontSize: 14,
    color: "rgb(var(--c-fg))",
    outline: "none",
    fontFamily: "inherit",
    transition: "border-color 150ms ease",
    boxSizing: "border-box",
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "rgb(var(--c-bg))",
        padding: 16,
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 380,
          backgroundColor: "rgb(var(--c-surface))",
          border: "1px solid rgb(var(--c-border))",
          borderRadius: 12,
          padding: "32px 28px",
        }}
      >
        {/* Logo */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            marginBottom: 28,
            gap: 10,
          }}
        >
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: 10,
              backgroundColor: "rgb(var(--c-primary))",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {config.brand_logo_url ? (
              <img
                src={config.brand_logo_url}
                alt={config.brand_name}
                style={{ width: 28, height: 28, objectFit: "cover", borderRadius: 6 }}
              />
            ) : (
              <Zap size={20} color="#fff" />
            )}
          </div>
          <div style={{ textAlign: "center" }}>
            <h2 style={{ color: "rgb(var(--c-fg))", margin: "0 0 3px", fontSize: 18 }}>
              {config.brand_name}
            </h2>
            {config.brand_tagline && (
              <p style={{ fontSize: 12, color: "rgb(var(--c-fg-muted))", margin: 0 }}>
                {config.brand_tagline}
              </p>
            )}
          </div>
        </div>

        {/* Tab toggle */}
        <div
          style={{
            display: "flex",
            backgroundColor: "rgb(var(--c-surface-2))",
            border: "1px solid rgb(var(--c-border))",
            borderRadius: "calc(var(--radius) - 2px)",
            padding: 3,
            marginBottom: 20,
            gap: 2,
          }}
        >
          {(["signin", "signup"] as Mode[]).map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              style={{
                flex: 1,
                padding: "7px 0",
                border: "none",
                borderRadius: "calc(var(--radius) - 4px)",
                fontSize: 13,
                fontWeight: 500,
                cursor: "pointer",
                fontFamily: "inherit",
                transition: "all 150ms ease",
                backgroundColor: mode === m ? "rgb(var(--c-surface-3))" : "transparent",
                color: mode === m ? "rgb(var(--c-fg))" : "rgb(var(--c-fg-muted))",
              }}
            >
              {m === "signin" ? "Sign In" : "Sign Up"}
            </button>
          ))}
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <label style={{ fontSize: 12, fontWeight: 600, color: "rgb(var(--c-fg-muted))" }}>
              Email
            </label>
            <input
              type="email"
              dir="ltr"
              required
              placeholder="your@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={inputStyle}
              onFocus={(e) => { (e.currentTarget as HTMLInputElement).style.borderColor = "rgb(var(--c-primary))"; }}
              onBlur={(e) => { (e.currentTarget as HTMLInputElement).style.borderColor = "rgb(var(--c-border))"; }}
            />
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <label style={{ fontSize: 12, fontWeight: 600, color: "rgb(var(--c-fg-muted))" }}>
              Password
            </label>
            <input
              type="password"
              dir="ltr"
              required
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              minLength={mode === "signup" ? 6 : undefined}
              style={inputStyle}
              onFocus={(e) => { (e.currentTarget as HTMLInputElement).style.borderColor = "rgb(var(--c-primary))"; }}
              onBlur={(e) => { (e.currentTarget as HTMLInputElement).style.borderColor = "rgb(var(--c-border))"; }}
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            style={{
              marginTop: 4,
              padding: "11px 0",
              backgroundColor: "rgb(var(--c-primary))",
              color: "#fff",
              border: "none",
              borderRadius: "calc(var(--radius) - 2px)",
              fontSize: 14,
              fontWeight: 600,
              cursor: isLoading ? "not-allowed" : "pointer",
              fontFamily: "inherit",
              opacity: isLoading ? 0.6 : 1,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              transition: "opacity 150ms ease",
            }}
          >
            {isLoading ? (
              <>
                <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} />
                {mode === "signin" ? "Signing in…" : "Creating account…"}
              </>
            ) : mode === "signin" ? (
              "Sign In"
            ) : (
              "Create Account"
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
