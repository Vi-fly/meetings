import { supabase } from "@/integrations/supabase/client";
import { Database } from "@/integrations/supabase/types";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";

type Meeting = Database["public"]["Tables"]["meetings"]["Row"];
type MeetingMinutes = Database["public"]["Tables"]["meeting_minutes"]["Row"];
type MeetingVideos = Database["public"]["Tables"]["meeting_videos"]["Row"];
type BlogPost = Database["public"]["Tables"]["blog_posts"]["Row"];

export interface ContentItem {
  id: string;
  type: 'transcript' | 'mom' | 'recordings' | 'poster' | 'blog';
  title: string;
  meetingTitle: string;
  meetingId: string;
  date: string;
  duration?: string;
  participants?: number;
  url?: string;
  thumbnail?: string;
  preview?: string;
  content?: string;
  size?: string;
}

export function useContentGallery() {
  return useQuery({
    queryKey: ["content-gallery"],
    queryFn: async (): Promise<ContentItem[]> => {
      const contentItems: ContentItem[] = [];

      try {
        // Fetch meetings with their related content
        const { data: meetings, error: meetingsError } = await supabase
          .from("meetings")
          .select(`
            *,
            meeting_minutes(*),
            meeting_videos(*),
            blog_posts(*),
            meeting_attendees(*)
          `)
          .order("scheduled_at", { ascending: false });

        if (meetingsError) throw meetingsError;

        if (meetings) {
          meetings.forEach((meeting: any) => {
            const scheduledDate = new Date(meeting.scheduled_at);
            const attendees = meeting.meeting_attendees?.attendees as any[] || [];
            const participantCount = attendees.length;

            // Add meeting minutes (MOM) - handle both single object and array
            const meetingMinutes = Array.isArray(meeting.meeting_minutes) 
              ? meeting.meeting_minutes[0] 
              : meeting.meeting_minutes;

            if (meetingMinutes) {
                              contentItems.push({
                  id: `mom-${meetingMinutes.meeting_id}`,
                  type: 'mom',
                  title: `Meeting Minutes - ${meeting.title}`,
                  meetingTitle: meeting.title,
                  meetingId: meeting.id,
                  date: format(scheduledDate, "yyyy-MM-dd"),
                  duration: `${meeting.duration_mins || 60}m`,
                  participants: participantCount,
                  preview: meetingMinutes.summary || "Meeting minutes generated from transcript",
                  content: meetingMinutes.full_mom,
                  size: meetingMinutes.full_mom ? `${Math.round(meetingMinutes.full_mom.length / 1024)} KB` : undefined
                });

              // Add transcripts if available
              if (meetingMinutes.transcript) {
                const transcript = meetingMinutes.transcript;
                contentItems.push({
                  id: `transcript-${meeting.id}`,
                  type: 'transcript',
                  title: `${meeting.title} Transcript`,
                  meetingTitle: meeting.title,
                  meetingId: meeting.id,
                  date: format(scheduledDate, "yyyy-MM-dd"),
                  duration: `${meeting.duration_mins || 60}m`,
                  participants: participantCount,
                  preview: transcript.substring(0, 200) + (transcript.length > 200 ? "..." : ""),
                  content: transcript,
                  size: `${Math.round(transcript.length / 1024)} KB`
                });
              }
            }

            // Add meeting videos (reels) - handle both single object and array
            const meetingVideos = Array.isArray(meeting.meeting_videos) 
              ? meeting.meeting_videos 
              : meeting.meeting_videos ? [meeting.meeting_videos] : [];

            meetingVideos.forEach((video: MeetingVideos) => {
              contentItems.push({
                id: `video-${video.meeting_id}`,
                type: 'recordings',
                title: `${meeting.title} Recording`,
                meetingTitle: meeting.title,
                meetingId: meeting.id,
                date: format(scheduledDate, "yyyy-MM-dd"),
                duration: `${meeting.duration_mins || 60}m`,
                participants: participantCount,
                url: video.drive_share_link,
                preview: `Video recording: ${video.original_filename || 'Meeting recording'}`,
                size: "Video file"
              });
            });

            // Add blog posts - handle both single object and array
            const blogPosts = Array.isArray(meeting.blog_posts) 
              ? meeting.blog_posts 
              : meeting.blog_posts ? [meeting.blog_posts] : [];

            blogPosts.forEach((blog: BlogPost) => {
              contentItems.push({
                id: `blog-${blog.id}`,
                type: 'blog',
                title: blog.title || `Blog Post - ${meeting.title}`,
                meetingTitle: meeting.title,
                meetingId: meeting.id,
                date: format(scheduledDate, "yyyy-MM-dd"),
                duration: `${meeting.duration_mins || 60}m`,
                participants: participantCount,
                preview: blog.summary || (blog.content ? blog.content.substring(0, 200) + "..." : "Blog post content"),
                content: blog.content,
                size: blog.content ? `${Math.round(blog.content.length / 1024)} KB` : undefined
              });
            });
          });
        }

        console.log("Content items generated:", contentItems.length);
        contentItems.forEach(item => {
          console.log(`- ${item.type}: ${item.title}`);
        });

        return contentItems;
      } catch (error) {
        console.error("Error fetching content gallery data:", error);
        return [];
      }
    },
  });
}
