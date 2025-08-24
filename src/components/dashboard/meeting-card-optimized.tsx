import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Database } from "@/integrations/supabase/types";
import { format } from "date-fns";
import { Calendar, Clock, Users } from "lucide-react";
import { memo } from "react";

type Meeting = Database["public"]["Tables"]["meetings"]["Row"] & {
  meeting_attendees?: Database["public"]["Tables"]["meeting_attendees"]["Row"];
  meeting_minutes?: Database["public"]["Tables"]["meeting_minutes"]["Row"];
};

interface MeetingCardOptimizedProps {
  meeting: Meeting;
  onEdit: (meeting: Meeting) => void;
  onClick?: (meeting: Meeting) => void;
}

const getStatusBadge = (status: string) => {
  const colors = {
    upcoming: "bg-blue-100 text-blue-800",
    completed: "bg-green-100 text-green-800",
  };
  return colors[status as keyof typeof colors] || colors.completed;
};

const getDurationLabel = (duration: number) => {
  if (duration <= 30) return "Short";
  if (duration <= 60) return "Medium";
  return "Long";
};

export const MeetingCardOptimized = memo<MeetingCardOptimizedProps>(
  ({ meeting, onEdit, onClick }) => {
    const scheduledDate = new Date(meeting.scheduled_at);
    const now = new Date();
    const status = scheduledDate > now ? "upcoming" : "completed";
    const attendees = meeting.meeting_attendees?.attendees as any[] || [];
    const hasMinutes = !!meeting.meeting_minutes;

    const handleCardClick = () => {
      if (onClick) {
        onClick(meeting);
      }
    };

    return (
      <Card className="card-gradient card-hover cursor-pointer" onClick={handleCardClick}>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Avatar className="h-12 w-12">
                <AvatarImage src="" />
                <AvatarFallback>
                  <Calendar className="h-6 w-6" />
                </AvatarFallback>
              </Avatar>
              
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold">{meeting.title}</h3>
                  <Badge className={`${getStatusBadge(status)} text-xs`}>
                    {status}
                  </Badge>
                  {hasMinutes && (
                    <Badge variant="outline" className="text-xs">
                      Has Minutes
                    </Badge>
                  )}
                </div>
                
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    <span>{format(scheduledDate, "MMM dd, yyyy")}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    <span>{format(scheduledDate, "h:mm a")}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span>{meeting.duration_mins || 60}m</span>
                    <Badge variant="outline" className="text-xs">
                      {getDurationLabel(meeting.duration_mins || 60)}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-1">
                    <Users className="h-3 w-3" />
                    <span>{attendees.length} attendees</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <div className="text-right text-sm">
                <div className="font-medium">Code</div>
                <div className="text-muted-foreground">
                  {meeting.meeting_code}
                </div>
              </div>
              <Button 
                variant="default" 
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit(meeting);
                }}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                Edit
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  },
  (prevProps, nextProps) => {
    // Custom comparison to prevent unnecessary re-renders
    return (
      prevProps.meeting.id === nextProps.meeting.id &&
      prevProps.meeting.title === nextProps.meeting.title &&
      prevProps.meeting.scheduled_at === nextProps.meeting.scheduled_at &&
      prevProps.meeting.duration_mins === nextProps.meeting.duration_mins &&
      JSON.stringify(prevProps.meeting.meeting_attendees) === JSON.stringify(nextProps.meeting.meeting_attendees) &&
      !!prevProps.meeting.meeting_minutes === !!nextProps.meeting.meeting_minutes
    );
  }
);

MeetingCardOptimized.displayName = "MeetingCardOptimized"; 