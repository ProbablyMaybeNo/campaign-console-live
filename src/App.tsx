import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { FullScreenLoader } from "@/components/ui/TerminalLoader";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Campaigns from "./pages/Campaigns";
import CampaignDashboard from "./pages/CampaignDashboard";
import WarbandBuilder from "./pages/WarbandBuilder";
import NotFound from "./pages/NotFound";
import ErrorReports from "./pages/ErrorReports";
import Settings from "./pages/Settings";

const queryClient = new QueryClient();

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  
  if (loading) return <FullScreenLoader text="Authenticating" />;
  if (!user) return <Navigate to="/auth" replace />;
  
  return <>{children}</>;
}

function AuthRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  
  if (loading) return <FullScreenLoader text="Initializing" />;
  if (user) return <Navigate to="/campaigns" replace />;
  
  return <>{children}</>;
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/auth" element={<AuthRoute><Auth /></AuthRoute>} />
          <Route path="/campaigns" element={<ProtectedRoute><Campaigns /></ProtectedRoute>} />
          <Route path="/campaign/:campaignId" element={<ProtectedRoute><CampaignDashboard /></ProtectedRoute>} />
          <Route path="/campaign/:campaignId/warband-builder" element={<ProtectedRoute><WarbandBuilder /></ProtectedRoute>} />
          <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
          <Route path="/admin/errors" element={<ProtectedRoute><ErrorReports /></ProtectedRoute>} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
