import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import { AuthProvider } from "@/hooks/useAuth";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import Index from "./pages/Index";
import Dashboard from "./pages/Dashboard";
import Today from "./pages/Today";
import Patients from "./pages/Patients";
import PatientDetail from "./pages/PatientDetail";
import Schedule from "./pages/Schedule";
import Finance from "./pages/Finance";
import Settings from "./pages/Settings";
import Leads from "./pages/Leads";
import Integrations from "./pages/Integrations";
import Procedures from "./pages/Procedures";
import Auth from "./pages/Auth";
import LeadCapture from "./pages/LeadCapture";
import Onboarding from "./pages/Onboarding";
import NotFound from "./pages/NotFound";
import BlogMarketingClinicas from "./pages/BlogMarketingClinicas";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
  <HelmetProvider>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/auth" element={<Auth />} />
            <Route path="/captacao" element={<LeadCapture />} />
            <Route path="/blog/marketing-para-clinicas-de-estetica" element={<BlogMarketingClinicas />} />
            <Route path="/onboarding" element={<ProtectedRoute allow={["admin"]}><Onboarding /></ProtectedRoute>} />
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <Index />
                </ProtectedRoute>
              }
            >
              <Route index element={<Dashboard />} />
              <Route path="hoje" element={<ProtectedRoute allow={["admin", "staff"]}><Today /></ProtectedRoute>} />
              {/* Admin + staff */}
              <Route path="patients" element={<ProtectedRoute allow={["admin", "staff"]}><Patients /></ProtectedRoute>} />
              <Route path="patients/:id" element={<ProtectedRoute allow={["admin", "staff"]}><PatientDetail /></ProtectedRoute>} />
              <Route path="finance" element={<ProtectedRoute allow={["admin", "staff"]}><Finance /></ProtectedRoute>} />
              <Route path="settings" element={<ProtectedRoute allow={["admin"]}><Settings /></ProtectedRoute>} />
              {/* Shared with traffic managers */}
              <Route path="schedule" element={<Schedule />} />
              <Route path="leads" element={<Leads />} />
              <Route path="integrations" element={<Integrations />} />
              <Route path="procedures" element={<Procedures />} />
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </HelmetProvider>
</QueryClientProvider>
);

export default App;
