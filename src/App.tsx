import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/use-auth";
import { ThemeProvider } from "@/hooks/use-theme";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";

import { MeetingProcessor } from "./components/meeting/meeting-processor";
import Dashboard from "./pages/Dashboard";
import Login from "./pages/Login";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => {
  const { isAuthenticated, isLoading, login, logout } = useAuth();

  const handleLogin = async (credentials: { email: string; password: string }) => {
    const result = await login(credentials);
    if (!result.success) {
      console.error("Login failed:", result.error);
    }
  };

  const handleLogout = () => {
    logout();
  };

  // Show loading spinner while checking authentication
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="light" storageKey="meeting-dashboard-theme">
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              <Route 
                path="/" 
                element={
                  isAuthenticated ? (
                    <Dashboard onLogout={handleLogout} />
                  ) : (
                    <Login onLogin={handleLogin} />
                  )
                } 
              />

              {/* Debug route for testing Google Drive upload */}
              <Route 
                path="/debug-upload" 
                element={
                  isAuthenticated ? (
                    <div className="min-h-screen bg-background p-8">
                      <div className="max-w-4xl mx-auto">
                        <h1 className="text-2xl font-bold mb-6">Google Drive Upload Debug</h1>
                        
                      </div>
                    </div>
                  ) : (
                    <Login onLogin={handleLogin} />
                  )
                } 
              />

              {/* Meeting Processor Route */}
              <Route 
                path="/meeting-processor" 
                element={
                  isAuthenticated ? (
                    <div className="min-h-screen bg-background p-8">
                      <div className="max-w-4xl mx-auto">
                        <h1 className="text-2xl font-bold mb-6">Meeting Processor</h1>
                        <MeetingProcessor />
                      </div>
                    </div>
                  ) : (
                    <Login onLogin={handleLogin} />
                  )
                } 
              />
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
};

export default App;
