import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Logo } from "@/components/ui/logo";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { useToast } from "@/hooks/use-toast";
import { GoogleDriveAuthService, GoogleDriveAuthStatus } from "@/services/google-drive-auth";
import { Bell, CheckCircle, Cloud, LogOut, Search } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

interface DashboardHeaderProps {
  user: {
    name: string;
    email: string;
    avatar?: string;
  };
  onLogout: () => void;
  searchQuery?: string;
  onSearchChange?: (query: string) => void;
}

export function DashboardHeader({ user, onLogout, searchQuery = "", onSearchChange }: DashboardHeaderProps) {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [authStatus, setAuthStatus] = useState<GoogleDriveAuthStatus | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Check auth status on component mount
  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    try {
      const status = await GoogleDriveAuthService.checkAuthStatus();
      setAuthStatus(status);
    } catch (error) {
      console.error('Error checking auth status:', error);
    }
  };

  const handleGoogleDriveAuth = async () => {
    console.log('Starting Google Drive auth...');
    setIsLoading(true);
    try {
      console.log('Calling GoogleDriveAuthService.initiateAuth()...');
      const result = await GoogleDriveAuthService.initiateAuth();
      console.log('Auth result:', result);
      
      if (result.success) {
        toast({
          title: "Authorization Started",
          description: "Please complete the authorization in the new window.",
        });
        
        // Poll for status changes
        setTimeout(async () => {
          await checkAuthStatus();
        }, 3000);
      } else {
        console.error('Auth failed:', result.error);
        toast({
          title: "Authorization Failed",
          description: result.error || "Failed to start authorization",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Auth error:', error);
      toast({
        title: "Error",
        description: "Failed to initiate Google Drive authorization",
        variant: "destructive",
      });
    } finally {
      console.log('Setting loading to false');
      setIsLoading(false);
    }
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center space-x-4 sm:justify-between sm:space-x-0">
        <div className="flex items-center space-x-4">
          <Logo size="md" showText={true} />
        </div>

        <div className="flex flex-1 items-center justify-end space-x-4">
          <div className="w-full flex-1 md:w-auto md:flex-none">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search meetings..."
                value={searchQuery}
                onChange={(e) => onSearchChange?.(e.target.value)}
                className="pl-10 md:w-[300px] lg:w-[400px] transition-all duration-300 focus:shadow-glow"
              />
            </div>
          </div>

          <ThemeToggle />

          {/* Google Drive Authorization Button */}
          <Button 
            variant="ghost" 
            size="icon" 
            className="relative interactive-scale"
            onClick={handleGoogleDriveAuth}
            disabled={isLoading}
            title={authStatus?.authorized ? "Google Drive Authorized" : "Authorize Google Drive"}
          >
            {isLoading ? (
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
            ) : authStatus?.authorized ? (
              <CheckCircle className="h-4 w-4 text-green-500" />
            ) : (
              <Cloud className="h-4 w-4" />
            )}
          </Button>

          <Button variant="ghost" size="icon" className="relative interactive-scale">
            <Bell className="h-4 w-4" />
            <span className="absolute -top-1 -right-1 h-3 w-3 bg-destructive rounded-full flex items-center justify-center">
              <span className="text-[10px] text-destructive-foreground">2</span>
            </span>
          </Button>

          <div className="flex items-center space-x-3">
            <div className="hidden md:block text-right">
              <p className="text-sm font-medium">{user.name}</p>
              <p className="text-xs text-muted-foreground">{user.email}</p>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Avatar className="h-8 w-8 interactive-scale cursor-pointer">
                  <AvatarImage src={user.avatar} />
                  <AvatarFallback>
                    {user.name.split(' ').map(n => n[0]).join('')}
                  </AvatarFallback>
                </Avatar>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={onLogout} className="cursor-pointer">
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Logout</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
    </header>
  );
}