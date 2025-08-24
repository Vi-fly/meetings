import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Calendar, Clock, ExternalLink, Users } from "lucide-react";


interface Attendee {
  id: string;
  name: string;
  attended: boolean;
}

interface Meeting {
  id: string;
  title: string;
  date: string;
  time: string;
  duration: string;
  attendees: Attendee[];
  status: "upcoming" | "completed" | "ongoing";
  hasMinutes: boolean;
  meetingLink?: string;
}

interface MeetingCardProps {
  meeting: Meeting;
  onEditMinutes?: (meetingId: string) => void;
  onSendMinutes?: (meetingId: string) => void;
  delay?: number;
  onClick?: (meeting: Meeting) => void;
  momSent?: boolean;
}

export function MeetingCard({ 
  meeting, 
  onEditMinutes, 
  onSendMinutes, 
  delay = 0,
  onClick,
  momSent = false
}: MeetingCardProps) {
  const attendedCount = meeting.attendees.filter(a => a.attended).length;
  const totalAttendees = meeting.attendees.length;

  const getStatusColor = (status: string) => {
    switch (status) {
      case "upcoming":
        return "bg-blue-100 text-blue-800";
      case "ongoing":
        return "bg-yellow-100 text-yellow-800";
      case "completed":
        return "bg-green-100 text-green-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const handleCardClick = () => {
    if (onClick) {
      onClick(meeting);
    }
  };

  return (
    <Card 
      className="card-gradient card-hover cursor-pointer transition-all duration-300 hover:shadow-lg"
      style={{ animationDelay: `${delay}ms` }}
      onClick={handleCardClick}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-lg truncate">{meeting.title}</h3>
            <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
              <div className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                <span>{meeting.date}</span>
              </div>
              <div className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                <span>{meeting.time}</span>
              </div>
              <div className="flex items-center gap-1">
                <Users className="h-3 w-3" />
                <span>{attendedCount}/{totalAttendees}</span>
              </div>
            </div>
          </div>
                     <div className="flex items-center gap-2 ml-4">
             <Badge className={`${getStatusColor(meeting.status)} text-xs`}>
               {meeting.status.charAt(0).toUpperCase() + meeting.status.slice(1)}
             </Badge>
             {meeting.hasMinutes && momSent && (
               <div className="flex items-center gap-1 text-xs text-green-700 bg-green-50 px-2 py-1 rounded-full">
                 <div className="w-1.5 h-1.5 bg-green-500 rounded-full"></div>
                 <span>MOM sent</span>
               </div>
             )}
           </div>
        </div>
      </CardHeader>

      <CardContent className="pt-0">
                 <div className="flex items-center justify-between">
           <div className="flex items-center gap-2">
             <span className="text-sm text-muted-foreground">Duration: {meeting.duration}</span>
           </div>
          
          <div className="flex items-center gap-2">
            {meeting.meetingLink && meeting.status === "upcoming" && (
              <Button
                variant="outline"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  window.open(meeting.meetingLink, '_blank');
                }}
              >
                <ExternalLink className="h-3 w-3 mr-1" />
                Join Meeting
              </Button>
            )}
            
            {meeting.hasMinutes && onEditMinutes && (
              <Button
                variant="outline"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  onEditMinutes(meeting.id);
                }}
              >
                View Minutes
              </Button>
            )}
            
                         {meeting.hasMinutes && onSendMinutes && !momSent && (
               <Button
                 variant="default"
                 size="sm"
                 onClick={(e) => {
                   e.stopPropagation();
                   onSendMinutes(meeting.id);
                 }}
               >
                 Send MOM
               </Button>
             )}
          </div>
        </div>

        {/* Attendees Preview */}
        {meeting.attendees.length > 0 && (
          <div className="mt-4">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-sm font-medium">Attendees</span>
              <span className="text-xs text-muted-foreground">
                ({attendedCount} attended)
              </span>
            </div>
            <div className="flex items-center gap-1">
              {meeting.attendees.slice(0, 3).map((attendee, index) => (
                <Avatar key={attendee.id} className="h-6 w-6 border-2 border-background">
                  <AvatarFallback className="text-xs">
                    {attendee.name.charAt(0)}
                  </AvatarFallback>
                </Avatar>
              ))}
              {meeting.attendees.length > 3 && (
                <div className="h-6 w-6 rounded-full bg-muted flex items-center justify-center border-2 border-background">
                  <span className="text-xs">+{meeting.attendees.length - 3}</span>
                </div>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}