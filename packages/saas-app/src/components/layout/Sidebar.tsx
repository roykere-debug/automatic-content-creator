import { Link, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  FileText,
  Settings,
  Sparkles,
  Zap,
  LogOut,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useWorkspace } from "@/contexts/WorkspaceContext";

const navItems = [
  { path: "/",         label: "Dashboard",        icon: LayoutDashboard },
  { path: "/drafts",   label: "Drafts",            icon: FileText },
  { path: "/generate", label: "Article Generator", icon: Sparkles },
  { path: "/settings", label: "Settings",          icon: Settings },
];

export function Sidebar() {
  const location = useLocation();
  const { user, signOut } = useAuth();
  const { config } = useWorkspace();

  return (
    <aside
      style={{
        width: 232,
        minWidth: 232,
        height: "100vh",
        position: "fixed",
        top: 0,
        left: 0,
        display: "flex",
        flexDirection: "column",
        backgroundColor: "rgb(var(--c-surface))",
        borderRight: "1px solid rgb(var(--c-border))",
        zIndex: 50,
        overflowY: "auto",
      }}
    >
      {/* ── Logo ─────────────────────────── */}
      <div
        style={{
          padding: "20px 16px 16px",
          borderBottom: "1px solid rgb(var(--c-border))",
          display: "flex",
          alignItems: "center",
          gap: 10,
        }}
      >
        <div
          style={{
            width: 32,
            height: 32,
            borderRadius: 8,
            backgroundColor: "rgb(var(--c-primary))",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          {config.brand_logo_url ? (
            <img
              src={config.brand_logo_url}
              alt={config.brand_name}
              style={{ width: 20, height: 20, objectFit: "cover", borderRadius: 4 }}
            />
          ) : (
            <Zap size={16} color="#fff" />
          )}
        </div>
        <div style={{ minWidth: 0 }}>
          <div
            style={{
              fontSize: 14,
              fontWeight: 700,
              color: "rgb(var(--c-fg))",
              lineHeight: 1.2,
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {config.brand_name}
          </div>
          {config.brand_tagline && (
            <div
              style={{
                fontSize: 10,
                color: "rgb(var(--c-fg-muted))",
                marginTop: 1,
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
                letterSpacing: "0.03em",
              }}
            >
              {config.brand_tagline}
            </div>
          )}
        </div>
      </div>

      {/* ── Navigation ───────────────────── */}
      <nav style={{ flex: 1, padding: "12px 10px" }}>
        <div
          style={{
            fontSize: 10,
            fontWeight: 600,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            color: "rgb(var(--c-fg-subtle))",
            padding: "4px 6px 8px",
          }}
        >
          Menu
        </div>
        {navItems.map((item) => {
          const isActive =
            item.path === "/"
              ? location.pathname === "/"
              : location.pathname.startsWith(item.path);
          const Icon = item.icon;

          return (
            <Link
              key={item.path}
              to={item.path}
              className="nav-item"
              style={
                isActive
                  ? {
                      color: "rgb(var(--c-fg))",
                      backgroundColor: "rgb(var(--c-surface-2))",
                    }
                  : {}
              }
            >
              <Icon
                size={15}
                style={{
                  color: isActive ? "rgb(var(--c-primary))" : "rgb(var(--c-fg-muted))",
                  flexShrink: 0,
                }}
              />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* ── Footer ───────────────────────── */}
      <div
        style={{
          padding: "12px 10px",
          borderTop: "1px solid rgb(var(--c-border))",
          display: "flex",
          flexDirection: "column",
          gap: 4,
        }}
      >
        {/* User row */}
        {user && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "6px 8px",
              borderRadius: 6,
            }}
          >
            <div
              style={{
                width: 28,
                height: 28,
                borderRadius: "50%",
                backgroundColor: "rgb(var(--c-primary))",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
                fontSize: 11,
                fontWeight: 700,
                color: "#fff",
              }}
            >
              {(user.email?.[0] ?? "U").toUpperCase()}
            </div>
            <div style={{ minWidth: 0, flex: 1 }}>
              <div
                style={{
                  fontSize: 12,
                  fontWeight: 600,
                  color: "rgb(var(--c-fg))",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                {user.email?.split("@")[0]}
              </div>
              <div
                style={{
                  fontSize: 10,
                  color: "rgb(var(--c-fg-muted))",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                {user.email}
              </div>
            </div>
          </div>
        )}

        {/* Sign out */}
        {user && (
          <button
            onClick={signOut}
            className="nav-item"
            style={{ width: "100%", background: "none", border: "none", textAlign: "left" }}
          >
            <LogOut size={14} style={{ flexShrink: 0 }} />
            Sign out
          </button>
        )}
      </div>
    </aside>
  );
}
