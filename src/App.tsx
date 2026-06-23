import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import Index from "./pages/Index";
import Dashboard from "./pages/Dashboard";
import Patients from "./pages/Patients";
import Schedule from "./pages/Schedule";
import Finance from "./pages/Finance";
import Settings from "./pages/Settings";
import Leads from "./pages/Leads";
import Integrations from "./pages/Integrations";
import Procedures from "./pages/Procedures";
import Auth from "./pages/Auth";
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
            <Route path="/auth" element={<Auth />} />
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <Index />
                </ProtectedRoute>
              }
            >
              <Route index element={<Dashboard />} />
              {/* Admin-only */}
              <Route path="patients" element={<ProtectedRoute allow={["admin"]}><Patients /></ProtectedRoute>} />
              <Route path="finance" element={<ProtectedRoute allow={["admin"]}><Finance /></ProtectedRoute>} />
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
  </QueryClientProvider>
);

export default App;
