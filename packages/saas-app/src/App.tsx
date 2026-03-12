import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { WorkspaceProvider } from "@/contexts/WorkspaceContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { ChatWidget } from "@/components/chatbot/ChatWidget";
import Index from "./pages/Index";
import Settings from "./pages/Settings";
import Auth from "./pages/Auth";
import ArticleGenerator from "./pages/ArticleGenerator";
import Drafts from "./pages/Drafts";
import NotFound from "./pages/NotFound";
import Widget from "./pages/Widget";
import Onboarding from "./pages/Onboarding";

const queryClient = new QueryClient();

// Only show ChatWidget when user is on an authenticated page
const AppChatWidget = () => {
  const location = useLocation();
  const publicPaths = ["/auth", "/widget"];
  if (publicPaths.some((p) => location.pathname.startsWith(p))) return null;
  return <ChatWidget />;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner position="top-right" theme="dark" />
      <BrowserRouter>
        <AuthProvider>
          <WorkspaceProvider>
            <ThemeProvider>
              <Routes>
                <Route path="/auth" element={<Auth />} />
                <Route
                  path="/"
                  element={
                    <ProtectedRoute requireAdmin>
                      <Index />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/settings"
                  element={
                    <ProtectedRoute requireAdmin>
                      <Settings />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/generate"
                  element={
                    <ProtectedRoute requireAdmin>
                      <ArticleGenerator />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/drafts"
                  element={
                    <ProtectedRoute requireAdmin>
                      <Drafts />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/onboarding"
                  element={
                    <ProtectedRoute requireAdmin skipOnboardingCheck>
                      <Onboarding />
                    </ProtectedRoute>
                  }
                />
                {/* Public widget route — for iframe embedding */}
                <Route path="/widget" element={<Widget />} />
                <Route path="*" element={<NotFound />} />
              </Routes>
              <AppChatWidget />
            </ThemeProvider>
          </WorkspaceProvider>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
