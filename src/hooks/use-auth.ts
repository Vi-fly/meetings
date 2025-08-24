import { useEffect, useState } from "react";

interface User {
  id: string;
  email: string;
  name?: string;
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

const AUTH_STORAGE_KEY = "meeting-dashboard-auth";

export function useAuth() {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    isAuthenticated: false,
    isLoading: true,
  });

  // Load authentication state from localStorage on mount
  useEffect(() => {
    const loadAuthState = () => {
      try {
        const storedAuth = localStorage.getItem(AUTH_STORAGE_KEY);
        if (storedAuth) {
          const parsedAuth = JSON.parse(storedAuth);
          setAuthState({
            user: parsedAuth.user,
            isAuthenticated: true,
            isLoading: false,
          });
        } else {
          setAuthState(prev => ({ ...prev, isLoading: false }));
        }
      } catch (error) {
        console.error("Error loading auth state:", error);
        setAuthState(prev => ({ ...prev, isLoading: false }));
      }
    };

    loadAuthState();
  }, []);

  const login = async (credentials: { email: string; password: string }) => {
    try {
      // For demo purposes, allow any credentials
      // In production, you would validate against Supabase auth
      const user: User = {
        id: "demo-user-id",
        email: credentials.email,
        name: credentials.email.split("@")[0],
      };

      const authData = { user, isAuthenticated: true };
      
      // Store in localStorage
      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(authData));
      
      setAuthState({
        user,
        isAuthenticated: true,
        isLoading: false,
      });

      return { success: true, user };
    } catch (error) {
      console.error("Login error:", error);
      return { success: false, error: "Login failed" };
    }
  };

  const logout = () => {
    // Clear from localStorage
    localStorage.removeItem(AUTH_STORAGE_KEY);
    
    setAuthState({
      user: null,
      isAuthenticated: false,
      isLoading: false,
    });
  };

  const checkAuth = () => {
    const storedAuth = localStorage.getItem(AUTH_STORAGE_KEY);
    if (storedAuth) {
      try {
        const parsedAuth = JSON.parse(storedAuth);
        if (parsedAuth.user && parsedAuth.isAuthenticated) {
          setAuthState({
            user: parsedAuth.user,
            isAuthenticated: true,
            isLoading: false,
          });
          return true;
        }
      } catch (error) {
        console.error("Error parsing auth state:", error);
      }
    }
    
    setAuthState({
      user: null,
      isAuthenticated: false,
      isLoading: false,
    });
    return false;
  };

  return {
    user: authState.user,
    isAuthenticated: authState.isAuthenticated,
    isLoading: authState.isLoading,
    login,
    logout,
    checkAuth,
  };
} 