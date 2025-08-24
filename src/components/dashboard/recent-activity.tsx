import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ActivityItem, useRecentActivity } from "@/hooks/use-recent-activity";
import { formatDistanceToNow } from "date-fns";
import {
    Calendar,
    CheckCircle,
    Clock,
    Edit3,
    ExternalLink,
    FileText,
    Mail,
    Users,
    Video
} from "lucide-react";
import { useState } from "react";

interface RecentActivityProps {
  onMeetingClick?: (meetingId: string) => void;
}

const getActivityIcon = (type: ActivityItem['type']) => {
  switch (type) {
    case 'meeting_created':
      return Calendar;
    case 'meeting_completed':
      return CheckCircle;
    case 'minutes_generated':
      return FileText;
    case 'minutes_sent':
      return Mail;
    case 'video_uploaded':
      return Video;
    case 'meeting_updated':
      return Edit3;
    default:
      return Clock;
  }
};

const getActivityColor = (type: ActivityItem['type']) => {
  switch (type) {
    case 'meeting_created':
      return 'bg-blue-500';
    case 'meeting_completed':
      return 'bg-green-500';
    case 'minutes_generated':
      return 'bg-purple-500';
    case 'minutes_sent':
      return 'bg-orange-500';
    case 'video_uploaded':
      return 'bg-red-500';
    case 'meeting_updated':
      return 'bg-yellow-500';
    default:
      return 'bg-gray-500';
  }
};

export const RecentActivity = ({ onMeetingClick }: RecentActivityProps) => {
  const { data: activities = [], isLoading, error } = useRecentActivity();
  const [showAll, setShowAll] = useState(false);

  // Always show only 5 items initially, or all if showAll is true
  const displayedActivities = showAll ? activities : activities.slice(0, 5);
  const hasMoreActivities = activities.length > 5;

  if (isLoading) {
    return (
      <Card className="card-gradient card-hover">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-primary" />
            Recent Activity
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="flex items-center space-x-3 animate-pulse">
                <div className="w-2 h-2 bg-muted rounded-full"></div>
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-muted rounded w-3/4"></div>
                  <div className="h-3 bg-muted rounded w-1/2"></div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="card-gradient card-hover">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-primary" />
            Recent Activity
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4 text-muted-foreground">
            <p className="text-sm">Unable to load recent activity</p>
            <p className="text-xs">Please try again later</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="card-gradient card-hover">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5 text-primary" />
          Recent Activity
          {activities.length > 0 && (
            <Badge variant="secondary" className="ml-auto">
              {activities.length}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {activities.length === 0 ? (
          <div className="text-center py-6 text-muted-foreground">
            <Clock className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm font-medium">No recent activity</p>
            <p className="text-xs">Start creating meetings to see activity here</p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-3">
              {displayedActivities.map((activity) => {
                const Icon = getActivityIcon(activity.type);
                const colorClass = getActivityColor(activity.type);
                
                return (
                  <div key={activity.id} className="flex items-start space-x-3 group">
                    <div className={`w-2 h-2 ${colorClass} rounded-full mt-2 flex-shrink-0`}></div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium leading-tight group-hover:text-primary transition-colors">
                            {activity.title}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {activity.description}
                          </p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-xs text-muted-foreground">
                              {formatDistanceToNow(activity.timestamp, { addSuffix: true })}
                            </span>
                            {activity.participants && activity.participants > 0 && (
                              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                <Users className="h-3 w-3" />
                                {activity.participants}
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Icon className="h-4 w-4 text-muted-foreground" />
                          {activity.meetingId && onMeetingClick && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0"
                              onClick={() => onMeetingClick(activity.meetingId!)}
                            >
                              <ExternalLink className="h-3 w-3" />
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {hasMoreActivities && (
              <div className="pt-2 border-t">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowAll(!showAll)}
                  className="w-full text-xs"
                >
                  {showAll ? 'Show Less' : `Show ${activities.length - 5} More`}
                </Button>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
