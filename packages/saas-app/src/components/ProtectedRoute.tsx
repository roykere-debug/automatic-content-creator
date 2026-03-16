import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { Loader2 } from 'lucide-react';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireAdmin?: boolean;
  skipOnboardingCheck?: boolean;
}

export function ProtectedRoute({ children, requireAdmin = false, skipOnboardingCheck = false }: ProtectedRouteProps) {
  const { user, isAdmin, isLoading: authLoading } = useAuth();
  const { isOnboardingNeeded, isLoading: wsLoading, error } = useWorkspace();
  const location = useLocation();

  if (authLoading || wsLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center max-w-sm mx-auto p-6">
          <h1 className="text-2xl font-bold text-foreground mb-2">Error Loading Workspace</h1>
          <p className="text-muted-foreground mb-4">{error}</p>
          <div className="flex gap-3 justify-center">
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
            >
              Retry
            </button>
            <button
              onClick={async () => {
                const { supabase } = await import('@/integrations/supabase/client');
                await supabase.auth.signOut();
                window.location.href = '/auth';
              }}
              className="px-4 py-2 rounded-lg bg-surface border border-border text-foreground text-sm font-medium hover:bg-surface/80 transition-colors"
            >
              Sign Out
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (requireAdmin && !isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-foreground mb-2">אין הרשאה</h1>
          <p className="text-muted-foreground">אין לך הרשאת admin לגשת לעמוד זה.</p>
        </div>
      </div>
    );
  }

  if (!skipOnboardingCheck && isOnboardingNeeded && location.pathname !== '/onboarding') {
    return <Navigate to="/onboarding" replace />;
  }

  return <>{children}</>;
}
