import { Zap, Activity, Settings, BarChart3, Menu, LogOut, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Link, useLocation } from "react-router-dom";
import { useState } from "react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useAuth } from "@/hooks/useAuth";
import { useWorkspace } from "@/contexts/WorkspaceContext";

/**
 * Generalized Header — reads brand_name from workspace config.
 * No hardcoded "I-HLS HUNTER" or military design.
 */
export function Header() {
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(false);
  const { user, signOut } = useAuth();
  const { config } = useWorkspace();

  const handleSignOut = async () => {
    await signOut();
    setIsOpen(false);
  };

  const navItems = [
    { path: "/", label: "Dashboard", icon: BarChart3 },
    { path: "/drafts", label: "Drafts", icon: FileText },
    { path: "/settings", label: "Settings", icon: Settings },
  ];

  const NavLinks = ({ onItemClick }: { onItemClick?: () => void }) => (
    <>
      {navItems.map((item) => {
        const isActive = location.pathname === item.path;
        return (
          <Link key={item.path} to={item.path} onClick={onItemClick}>
            <Button
              variant={isActive ? "default" : "ghost"}
              size="sm"
              className="gap-2 w-full justify-start md:w-auto md:justify-center"
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </Button>
          </Link>
        );
      })}
    </>
  );

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex h-14 md:h-16 items-center justify-between px-3 md:px-6">
        {/* Logo & Brand */}
        <div className="flex items-center gap-2 md:gap-4">
          <div className="relative flex items-center gap-2 md:gap-3">
            <div className="relative">
              {config.brand_logo_url ? (
                <img
                  src={config.brand_logo_url}
                  alt={config.brand_name}
                  className="h-7 w-7 md:h-9 md:w-9 rounded object-cover"
                />
              ) : (
                <div
                  className="h-7 w-7 md:h-9 md:w-9 rounded-lg flex items-center justify-center"
                  style={{ backgroundColor: "var(--brand-primary, #3b82f6)" }}
                >
                  <Zap className="h-4 w-4 md:h-5 md:w-5 text-white" />
                </div>
              )}
              <div
                className="absolute -right-1 -top-1 h-2 w-2 md:h-2.5 md:w-2.5 rounded-full animate-pulse"
                style={{ backgroundColor: "var(--brand-accent, #10b981)" }}
              />
            </div>
            <div className="flex flex-col">
              <span className="font-semibold text-sm md:text-base tracking-tight text-foreground">
                {config.brand_name}
              </span>
              <span className="text-[9px] md:text-[10px] uppercase tracking-wider text-muted-foreground hidden sm:block">
                {config.brand_tagline}
              </span>
            </div>
          </div>
        </div>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-1">
          <NavLinks />
        </nav>

        {/* Desktop Status & Logout */}
        <div className="hidden md:flex items-center gap-4">
          <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/30 px-3 py-1.5">
            <Activity className="h-3.5 w-3.5 text-emerald-400 animate-pulse" />
            <span className="text-xs text-muted-foreground font-mono">LIVE</span>
          </div>
          {user && (
            <Button variant="ghost" size="sm" onClick={handleSignOut} className="gap-2">
              <LogOut className="h-4 w-4" />
              Sign out
            </Button>
          )}
        </div>

        {/* Mobile Menu */}
        <div className="flex md:hidden items-center gap-2">
          <Badge variant="outline" className="text-[10px] px-2 border-emerald-500/40 text-emerald-400">
            <Activity className="h-3 w-3 mr-1" />
            LIVE
          </Badge>

          <Sheet open={isOpen} onOpenChange={setIsOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="h-9 w-9">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-64 bg-background border-border">
              <div className="flex flex-col gap-4 mt-8">
                <div className="flex items-center gap-2 mb-4">
                  <Zap className="h-5 w-5" style={{ color: "var(--brand-primary, #3b82f6)" }} />
                  <span className="font-semibold">{config.brand_name}</span>
                </div>
                <nav className="flex flex-col gap-2">
                  <NavLinks onItemClick={() => setIsOpen(false)} />
                  {user && (
                    <Button variant="ghost" size="sm" onClick={handleSignOut} className="gap-2 justify-start mt-4">
                      <LogOut className="h-4 w-4" />
                      Sign out
                    </Button>
                  )}
                </nav>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
