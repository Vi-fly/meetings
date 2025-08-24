import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function getDisplayName(attendee: any): string {
  // Extract name from various possible fields
  if (attendee?.name) {
    return attendee.name;
  } else if (attendee?.username) {
    return attendee.username;
  } else if (attendee?.email) {
    // If only email is available, extract a readable name from it
    const emailName = attendee.email.split('@')[0];
    // Convert email name to proper case (e.g., "emily.w" -> "Emily W")
    return emailName
      .split('.')
      .map(part => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ');
  } else {
    return 'Unknown';
  }
}

export function getInitials(name: string): string {
  if (!name || name === 'Unknown') return '?';
  
  // Split by spaces and dots, then take first character of each part
  const parts = name.split(/[\s.]+/).filter(part => part.length > 0);
  if (parts.length === 0) return '?';
  
  // Return first character of first part, or first two characters if only one part
  if (parts.length === 1) {
    return parts[0].charAt(0).toUpperCase();
  } else {
    return (parts[0].charAt(0) + parts[1].charAt(0)).toUpperCase();
  }
}
