import { cn } from "@/lib/utils";

interface LogoProps {
  className?: string;
  size?: "sm" | "md" | "lg" | "xl";
  showText?: boolean;
  variant?: "default" | "white" | "dark";
}

export function Logo({ 
  className, 
  size = "md", 
  showText = true, 
  variant = "default" 
}: LogoProps) {
  const sizeConfig = {
    sm: { icon: "w-6 h-6", text: "text-sm" },
    md: { icon: "w-8 h-8", text: "text-base" },
    lg: { icon: "w-10 h-10", text: "text-lg" },
    xl: { icon: "w-12 h-12", text: "text-xl" }
  };

  const { icon: iconSize, text: textSize } = sizeConfig[size];

  const getGradientId = () => {
    switch (variant) {
      case "white":
        return "gradient-white";
      case "dark":
        return "gradient-dark";
      default:
        return "gradient-default";
    }
  };

  const getTextColor = () => {
    switch (variant) {
      case "white":
        return "text-white";
      case "dark":
        return "text-gray-900";
      default:
        return "text-foreground";
    }
  };

  return (
    <div className={cn("flex items-center space-x-2", className)}>
      <svg
        width="32"
        height="32"
        viewBox="0 0 32 32"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={cn(iconSize, "flex-shrink-0")}
      >
        <rect width="32" height="32" rx="6" fill={`url(#${getGradientId()})`} />
        <path 
          d="M8 10h16v2H8zM8 14h12v2H8zM8 18h8v2H8z" 
          fill={variant === "default" ? "white" : variant === "white" ? "rgba(255,255,255,0.9)" : "rgba(0,0,0,0.8)"}
        />
        <circle 
          cx="12" 
          cy="24" 
          r="1" 
          fill={variant === "default" ? "white" : variant === "white" ? "rgba(255,255,255,0.8)" : "rgba(0,0,0,0.6)"} 
          opacity="0.8"
        />
        <circle 
          cx="16" 
          cy="24" 
          r="1" 
          fill={variant === "default" ? "white" : variant === "white" ? "rgba(255,255,255,0.8)" : "rgba(0,0,0,0.6)"} 
          opacity="0.8"
        />
        <circle 
          cx="20" 
          cy="24" 
          r="1" 
          fill={variant === "default" ? "white" : variant === "white" ? "rgba(255,255,255,0.8)" : "rgba(0,0,0,0.6)"} 
          opacity="0.8"
        />
        
        <defs>
          <linearGradient id="gradient-default" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style={{ stopColor: "#667eea", stopOpacity: 1 }} />
            <stop offset="100%" style={{ stopColor: "#764ba2", stopOpacity: 1 }} />
          </linearGradient>
          <linearGradient id="gradient-white" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style={{ stopColor: "rgba(255,255,255,0.9)", stopOpacity: 1 }} />
            <stop offset="100%" style={{ stopColor: "rgba(255,255,255,0.7)", stopOpacity: 1 }} />
          </linearGradient>
          <linearGradient id="gradient-dark" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style={{ stopColor: "#1f2937", stopOpacity: 1 }} />
            <stop offset="100%" style={{ stopColor: "#374151", stopOpacity: 1 }} />
          </linearGradient>
        </defs>
      </svg>
      
      {showText && (
        <div className="flex flex-col">
          <span className={cn("font-bold leading-tight", textSize, getTextColor())}>
            Sync Essence
          </span>
          {size === "lg" || size === "xl" ? (
            <span className="text-xs text-muted-foreground leading-tight">
              Smart Meetings
            </span>
          ) : null}
        </div>
      )}
    </div>
  );
}
