import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

interface NewMeetingFABProps {
  onClick: () => void;
}

export function NewMeetingFAB({ onClick }: NewMeetingFABProps) {
  return (
    <Button
      size="lg"
      className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-lg hover:shadow-xl bg-gradient-primary hover:scale-110 transition-all duration-300 z-50"
      onClick={onClick}
    >
      <Plus className="h-6 w-6" />
      <span className="sr-only">Create new meeting</span>
    </Button>
  );
}