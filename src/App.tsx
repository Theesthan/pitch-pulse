import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { AppLayout } from "@/components/layout/AppLayout";

// Pages
import Login from "@/pages/Login";
import Signup from "@/pages/Signup";
import Dashboard from "@/pages/Dashboard";
import Runs from "@/pages/Runs";
import NewRun from "@/pages/NewRun";
import RunDetail from "@/pages/RunDetail";
import Approvals from "@/pages/Approvals";
import Exports from "@/pages/Exports";
import Admin from "@/pages/Admin";
import NotFound from "@/pages/NotFound";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      retry: 1,
    },
  },
});

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            {/* Public routes */}
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />

            {/* Protected routes with layout */}
            <Route
              element={
                <ProtectedRoute>
                  <AppLayout />
                </ProtectedRoute>
              }
            >
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/runs" element={<Runs />} />
              <Route path="/runs/new" element={<NewRun />} />
              <Route path="/runs/:id" element={<RunDetail />} />
              <Route path="/approvals" element={
                <ProtectedRoute requiredRole="reviewer">
                  <Approvals />
                </ProtectedRoute>
              } />
              <Route path="/exports" element={<Exports />} />
              <Route path="/admin" element={
                <ProtectedRoute requiredRole="admin">
                  <Admin />
                </ProtectedRoute>
              } />
            </Route>

            {/* Redirects */}
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            
            {/* 404 */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
