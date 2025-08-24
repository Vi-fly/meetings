import { supabase } from "@/integrations/supabase/client";
import { Database } from "@/integrations/supabase/types";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

type Meeting = Database["public"]["Tables"]["meetings"]["Row"] & {
  meeting_attendees?: Database["public"]["Tables"]["meeting_attendees"]["Row"];
  meeting_minutes?: Database["public"]["Tables"]["meeting_minutes"]["Row"];
  meeting_videos?: Database["public"]["Tables"]["meeting_videos"]["Row"];
  blog_posts?: Database["public"]["Tables"]["blog_posts"]["Row"];
};

export function useMeetingDetails(meetingId: string) {
  const queryClient = useQueryClient();

  // Load meeting videos
  const { data: videos, isLoading: videosLoading } = useQuery({
    queryKey: ["meeting-videos", meetingId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("meeting_videos")
        .select("*")
        .eq("meeting_id", meetingId)
        .order("uploaded_at", { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!meetingId,
  });

  // Load meeting minutes
  const { data: minutes, isLoading: minutesLoading } = useQuery({
    queryKey: ["meeting-minutes", meetingId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("meeting_minutes")
        .select("*")
        .eq("meeting_id", meetingId)
        .single();

      if (error && error.code !== 'PGRST116') throw error; // PGRST116 = no rows returned
      return data;
    },
    enabled: !!meetingId,
  });

  // Load blog posts
  const { data: blogPosts, isLoading: blogLoading } = useQuery({
    queryKey: ["meeting-blog-posts", meetingId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("blog_posts")
        .select("*")
        .eq("meeting_id", meetingId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!meetingId,
  });

  // Add video mutation
  const addVideoMutation = useMutation({
    mutationFn: async (videoData: {
      meeting_id: string;
      drive_share_link: string;
      original_filename: string;
      uploaded_by: string;
    }) => {
      const { data, error } = await supabase
        .from("meeting_videos")
        .upsert(videoData, { onConflict: 'meeting_id' })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["meeting-videos", meetingId] });
    },
  });

  // Add minutes mutation
  const addMinutesMutation = useMutation({
    mutationFn: async (minutesData: {
      meeting_id: string;
      summary?: string;
      transcript?: string;
      full_mom?: string;
      created_by: string;
    }) => {
      const { data, error } = await supabase
        .from("meeting_minutes")
        .upsert(minutesData)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["meeting-minutes", meetingId] });
    },
  });

  // Add blog post mutation
  const addBlogPostMutation = useMutation({
    mutationFn: async (blogData: {
      meeting_id: string;
      title: string;
      content?: string;
      summary?: string;
    }) => {
      const { data, error } = await supabase
        .from("blog_posts")
        .insert(blogData)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["meeting-blog-posts", meetingId] });
    },
  });

  // Update MOM sent status mutation
  const updateMOMSentMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase
        .from("meeting_minutes")
        .update({ mom_sent: true })
        .eq("meeting_id", meetingId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["meeting-minutes", meetingId] });
    },
  });

  // Calculate activity progress
  const activityProgress = () => {
    const activities = {
      video: videos && videos.length > 0 ? 100 : 0,
      minutes: minutes ? 100 : 0,
      blog: blogPosts && blogPosts.length > 0 ? 100 : 0,
      ai: minutes?.summary ? 100 : 0
    };

    const total = Object.values(activities).reduce((sum, val) => sum + val, 0);
    return Math.round(total / Object.keys(activities).length);
  };

  return {
    videos: videos || [],
    minutes,
    blogPosts: blogPosts || [],
    isLoading: videosLoading || minutesLoading || blogLoading,
    activityProgress: activityProgress(),
    addVideo: addVideoMutation.mutateAsync,
    addMinutes: addMinutesMutation.mutateAsync,
    addBlogPost: addBlogPostMutation.mutateAsync,
    updateMOMSent: updateMOMSentMutation.mutateAsync,
    isAddingVideo: addVideoMutation.isPending,
    isAddingMinutes: addMinutesMutation.isPending,
    isAddingBlogPost: addBlogPostMutation.isPending,
  };
} 