import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { ApprovalGuard } from "@/components/layout/ApprovalGuard";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import Properties from "./pages/Properties";
import Units from "./pages/Units";
import Tenants from "./pages/Tenants";
import Leases from "./pages/Leases";
import Payments from "./pages/Payments";
import Maintenance from "./pages/Maintenance";
import Reports from "./pages/Reports";
import Admin from "./pages/Admin";
import ProfileSettings from "./pages/ProfileSettings";
import Receipt from "./pages/Receipt";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/dashboard" element={<ApprovalGuard><Dashboard /></ApprovalGuard>} />
            <Route path="/properties" element={<ApprovalGuard><Properties /></ApprovalGuard>} />
            <Route path="/units" element={<ApprovalGuard><Units /></ApprovalGuard>} />
            <Route path="/tenants" element={<ApprovalGuard><Tenants /></ApprovalGuard>} />
            <Route path="/leases" element={<ApprovalGuard><Leases /></ApprovalGuard>} />
            <Route path="/payments" element={<ApprovalGuard><Payments /></ApprovalGuard>} />
            <Route path="/maintenance" element={<ApprovalGuard><Maintenance /></ApprovalGuard>} />
            <Route path="/reports" element={<ApprovalGuard><Reports /></ApprovalGuard>} />
            <Route path="/admin" element={<ApprovalGuard><Admin /></ApprovalGuard>} />
            <Route path="/profile" element={<ApprovalGuard><ProfileSettings /></ApprovalGuard>} />
            <Route path="/receipt" element={<ApprovalGuard><Receipt /></ApprovalGuard>} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
