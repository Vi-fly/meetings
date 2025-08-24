import { supabase } from "@/integrations/supabase/client";
import { Database } from "@/integrations/supabase/types";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";

type Meeting = Database["public"]["Tables"]["meetings"]["Row"];
type MeetingMinutes = Database["public"]["Tables"]["meeting_minutes"]["Row"];
type MeetingVideos = Database["public"]["Tables"]["meeting_videos"]["Row"];

export interface ActivityItem {
  id: string;
  type: 'meeting_created' | 'meeting_completed' | 'minutes_generated' | 'minutes_sent' | 'video_uploaded' | 'meeting_updated';
  title: string;
  description: string;
  timestamp: Date;
  meetingId?: string;
  meetingTitle?: string;
  participants?: number;
  icon: string;
  color: string;
}

export const useRecentActivity = () => {
  return useQuery({
    queryKey: ["recent-activity"],
    queryFn: async (): Promise<ActivityItem[]> => {
      try {
        const activities: ActivityItem[] = [];

        // Fetch recent meetings with their related data
        const { data: meetings, error: meetingsError } = await supabase
          .from("meetings")
          .select(`
            *,
            meeting_minutes (*),
            meeting_videos (*)
          `)
          .order("created_at", { ascending: false })
          .limit(10);

        if (meetingsError) {
          console.error("Error fetching meetings:", meetingsError);
          return [];
        }

        if (!meetings || meetings.length === 0) return [];

        meetings.forEach((meeting: any) => {
          const meetingDate = new Date(meeting.created_at);
          const scheduledDate = meeting.scheduled_date ? new Date(meeting.scheduled_date) : null;
          const participantCount = meeting.participant_count || 0;

          // Meeting created activity
          activities.push({
            id: `meeting-created-${meeting.id}`,
            type: 'meeting_created',
            title: `Meeting "${meeting.title}" created`,
            description: `Scheduled for ${scheduledDate ? format(scheduledDate, 'MMM dd, yyyy') : 'TBD'}${participantCount > 0 ? ` with ${participantCount} participants` : ''}`,
            timestamp: meetingDate,
            meetingId: meeting.id,
            meetingTitle: meeting.title,
            participants: participantCount > 0 ? participantCount : undefined,
            icon: '📅',
            color: 'bg-blue-500'
          });

          // Meeting completed activity (if status is completed)
          if (meeting.status === 'completed') {
            activities.push({
              id: `meeting-completed-${meeting.id}`,
              type: 'meeting_completed',
              title: `Meeting "${meeting.title}" completed`,
              description: `Duration: ${meeting.duration_mins || 60} minutes`,
              timestamp: meetingDate,
              meetingId: meeting.id,
              meetingTitle: meeting.title,
              participants: participantCount > 0 ? participantCount : undefined,
              icon: '✅',
              color: 'bg-green-500'
            });
          }

          // Meeting minutes generated
          const meetingMinutes = Array.isArray(meeting.meeting_minutes) 
            ? meeting.meeting_minutes[0] 
            : meeting.meeting_minutes;

          if (meetingMinutes && meetingMinutes.full_mom) {
            activities.push({
              id: `minutes-generated-${meeting.id}`,
              type: 'minutes_generated',
              title: `Minutes generated for "${meeting.title}"`,
              description: `AI-generated meeting minutes available`,
              timestamp: new Date(meetingMinutes.created_at || meetingDate),
              meetingId: meeting.id,
              meetingTitle: meeting.title,
              participants: participantCount > 0 ? participantCount : undefined,
              icon: '📝',
              color: 'bg-purple-500'
            });

            // Minutes sent activity
            if (meetingMinutes.mom_sent) {
              activities.push({
                id: `minutes-sent-${meeting.id}`,
                type: 'minutes_sent',
                title: `Minutes sent for "${meeting.title}"`,
                description: participantCount > 0 ? `Sent to ${participantCount} participants via email` : 'Sent via email',
                timestamp: new Date(meetingMinutes.updated_at || meetingDate),
                meetingId: meeting.id,
                meetingTitle: meeting.title,
                participants: participantCount > 0 ? participantCount : undefined,
                icon: '📧',
                color: 'bg-orange-500'
              });
            }
          }

          // Video uploaded activity
          const meetingVideos = Array.isArray(meeting.meeting_videos) 
            ? meeting.meeting_videos 
            : meeting.meeting_videos ? [meeting.meeting_videos] : [];

          meetingVideos.forEach((video: MeetingVideos) => {
            activities.push({
              id: `video-uploaded-${video.id}`,
              type: 'video_uploaded',
              title: `Video uploaded for "${meeting.title}"`,
              description: `Recording: ${video.original_filename || 'Meeting recording'}`,
              timestamp: new Date(video.created_at || meetingDate),
              meetingId: meeting.id,
              meetingTitle: meeting.title,
              participants: participantCount > 0 ? participantCount : undefined,
              icon: '🎥',
              color: 'bg-red-500'
            });
          });

          // Meeting updated activity (if updated recently)
          if (meeting.updated_at && meeting.updated_at !== meeting.created_at) {
            activities.push({
              id: `meeting-updated-${meeting.id}`,
              type: 'meeting_updated',
              title: `Meeting "${meeting.title}" updated`,
              description: `Details modified`,
              timestamp: new Date(meeting.updated_at),
              meetingId: meeting.id,
              meetingTitle: meeting.title,
              participants: participantCount > 0 ? participantCount : undefined,
              icon: '✏️',
              color: 'bg-yellow-500'
            });
          }
        });

        // Sort activities by timestamp (most recent first)
        activities.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

        // Return only the most recent 10 activities
        return activities.slice(0, 10);

      } catch (error) {
        console.error("Error fetching recent activity:", error);
        return [];
      }
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchInterval: 5 * 60 * 1000, // Refetch every 5 minutes
  });
};
