import { supabase } from "@/integrations/supabase/client";
import { Database } from "@/integrations/supabase/types";
import { schedulerService } from "@/services/scheduler-service";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

type Meeting = Database["public"]["Tables"]["meetings"]["Row"];
type MeetingWithAttendees = Meeting & {
  meeting_attendees?: Database["public"]["Tables"]["meeting_attendees"]["Row"];
  meeting_minutes?: Database["public"]["Tables"]["meeting_minutes"]["Row"];
};

export function useMeetings() {
  return useQuery({
    queryKey: ["meetings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("meetings")
        .select(`
          *,
          meeting_attendees(*),
          meeting_minutes(*)
        `)
        .order("scheduled_at", { ascending: false });

      if (error) throw error;
      return data as MeetingWithAttendees[];
    },
  });
}

export function useMeetingsPaginated(page: number = 1, limit: number = 10) {
  return useQuery({
    queryKey: ["meetings", "paginated", page, limit],
    queryFn: async () => {
      const offset = (page - 1) * limit;
      
      const { data, error, count } = await supabase
        .from("meetings")
        .select(`
          *,
          meeting_attendees(*),
          meeting_minutes(*)
        `, { count: "exact" })
        .order("scheduled_at", { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) throw error;
      
      return {
        meetings: data as MeetingWithAttendees[],
        totalCount: count || 0,
        hasMore: (count || 0) > offset + limit,
        currentPage: page,
      };
    },
    placeholderData: (previousData) => previousData, // Keep previous data while loading new page
  });
}

export function useRecentMeetings(limit: number = 6) {
  return useQuery({
    queryKey: ["meetings", "recent", limit],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("meetings")
        .select(`
          *,
          meeting_attendees(*),
          meeting_minutes(*)
        `)
        .order("scheduled_at", { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data as MeetingWithAttendees[];
    },
  });
}

export function useCreateMeeting() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (meeting: {
      title: string;
      description: string;
      scheduled_at: string;
      duration_mins: number;
      meeting_code: string;
      meeting_link?: string;
      attendees?: Array<{ name: string; email: string }> | string[];
    }) => {
      // Combine description with meeting link if provided
      const fullDescription = meeting.meeting_link 
        ? `${meeting.description}\n\nMeeting Link: ${meeting.meeting_link}`
        : meeting.description;

      const { data: meetingData, error: meetingError } = await supabase
        .from("meetings")
        .insert({
          title: meeting.title,
          description: fullDescription,
          scheduled_at: meeting.scheduled_at,
          duration_mins: meeting.duration_mins,
          meeting_code: meeting.meeting_code,
        })
        .select()
        .single();

      if (meetingError) {
        console.error('Error creating meeting:', meetingError);
        throw new Error(`Failed to create meeting: ${meetingError.message}`);
      }

      // Add attendees if provided
      if (meeting.attendees && meeting.attendees.length > 0) {
        console.log('Original attendees data:', meeting.attendees);
        
        const attendeesData = meeting.attendees.map(attendee => {
          // Handle both string (email) and object (contact) formats
          if (typeof attendee === 'string') {
            return {
              name: attendee.split('@')[0], // Extract name from email
              email: attendee,
              attended: false,
            };
          } else {
            return {
              name: attendee.name,
              email: attendee.email,
              attended: false,
            };
          }
        });

        console.log('Processed attendees data:', attendeesData);

        // Use upsert to handle both insert and update cases
        const { error: attendeesError } = await supabase
          .from("meeting_attendees")
          .upsert({
            meeting_id: meetingData.id,
            attendees: attendeesData,
          }, {
            onConflict: 'meeting_id'
          });

        if (attendeesError) {
          console.error('Error adding attendees:', attendeesError);
          // Don't throw here, as the meeting was created successfully
          // Just log the error for debugging
        } else {
          console.log('Attendees saved successfully');
        }
      }

      // Schedule reminder for the meeting (30 minutes before)
      try {
        await schedulerService.scheduleMeetingReminder(meetingData.id, meeting.scheduled_at);
        console.log('Reminder scheduled successfully for meeting:', meetingData.title);
      } catch (error) {
        console.error('Error scheduling reminder:', error);
        // Don't throw error here as meeting creation should still succeed
      }

      return meetingData;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["meetings"] });
    },
  });
}

export function useUpdateMeeting() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (meeting: {
      id: string;
      title: string;
      description: string;
      scheduled_at: string;
      duration_mins: number;
      meeting_link?: string;
      attendees?: Array<{ name: string; email: string }> | string[];
    }) => {
      // Combine description with meeting link if provided
      const fullDescription = meeting.meeting_link 
        ? `${meeting.description}\n\nMeeting Link: ${meeting.meeting_link}`
        : meeting.description;

      const { data: meetingData, error: meetingError } = await supabase
        .from("meetings")
        .update({
          title: meeting.title,
          description: fullDescription,
          scheduled_at: meeting.scheduled_at,
          duration_mins: meeting.duration_mins,
        })
        .eq("id", meeting.id)
        .select()
        .single();

      if (meetingError) {
        console.error('Error updating meeting:', meetingError);
        throw new Error(`Failed to update meeting: ${meetingError.message}`);
      }

      // Update attendees if provided
      if (meeting.attendees && meeting.attendees.length > 0) {
        console.log('Original attendees data (update):', meeting.attendees);
        
        const attendeesData = meeting.attendees.map(attendee => {
          // Handle both string (email) and object (contact) formats
          if (typeof attendee === 'string') {
            return {
              name: attendee.split('@')[0], // Extract name from email
              email: attendee,
              attended: false,
            };
          } else {
            return {
              name: attendee.name,
              email: attendee.email,
              attended: false,
            };
          }
        });

        console.log('Processed attendees data (update):', attendeesData);

        // Use upsert to handle both insert and update cases
        const { error: attendeesError } = await supabase
          .from("meeting_attendees")
          .upsert({
            meeting_id: meeting.id,
            attendees: attendeesData,
          }, {
            onConflict: 'meeting_id'
          });

        if (attendeesError) {
          console.error('Error updating attendees:', attendeesError);
          // Don't throw here, as the meeting was updated successfully
          // Just log the error for debugging
        } else {
          console.log('Attendees updated successfully');
        }
      }

      return meetingData;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["meetings"] });
    },
  });
}

export function useContacts() {
  return useQuery({
    queryKey: ["contacts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contacts")
        .select(`
          *,
          organizations(name, domain)
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
  });
}

export function useContactsPaginated(page: number = 1, limit: number = 20) {
  return useQuery({
    queryKey: ["contacts", "paginated", page, limit],
    queryFn: async () => {
      const offset = (page - 1) * limit;
      
      const { data, error, count } = await supabase
        .from("contacts")
        .select(`
          *,
          organizations(name, domain)
        `, { count: "exact" })
        .order("created_at", { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) throw error;
      
      return {
        contacts: data,
        totalCount: count || 0,
        hasMore: (count || 0) > offset + limit,
        currentPage: page,
      };
    },
    placeholderData: (previousData) => previousData,
  });
}

export function useOrganizations() {
  return useQuery({
    queryKey: ["organizations"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("organizations")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      
      // Get contact counts for each organization
      const organizationsWithCounts = await Promise.all(
        (data || []).map(async (org) => {
          const { count } = await supabase
            .from("contacts")
            .select("*", { count: "exact", head: true })
            .eq("organization_id", org.id);
          
          return {
            ...org,
            contact_count: count || 0
          };
        })
      );
      
      return organizationsWithCounts;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });
}

export function useMeetingStats() {
  return useQuery({
    queryKey: ["meeting-stats"],
    queryFn: async () => {
      // Get total meetings count
      const { count: totalMeetings } = await supabase
        .from("meetings")
        .select("*", { count: "exact", head: true });

      // Get total unique attendees
      const { data: attendeesData } = await supabase
        .from("meeting_attendees")
        .select("attendees");

      const uniqueAttendees = new Set();
      attendeesData?.forEach(item => {
        if (Array.isArray(item.attendees)) {
          item.attendees.forEach((attendee: any) => {
            if (attendee.email) uniqueAttendees.add(attendee.email);
          });
        }
      });

      // Calculate average duration
      const { data: meetingsWithDuration } = await supabase
        .from("meetings")
        .select("duration_mins")
        .not("duration_mins", "is", null);

      const avgDuration = meetingsWithDuration?.length 
        ? meetingsWithDuration.reduce((sum, m) => sum + (m.duration_mins || 0), 0) / meetingsWithDuration.length
        : 60;

      // Calculate attendance rate
      let totalAttendees = 0;
      let attendedCount = 0;
      
      attendeesData?.forEach(item => {
        if (Array.isArray(item.attendees)) {
          totalAttendees += item.attendees.length;
          attendedCount += item.attendees.filter((a: any) => a.attended).length;
        }
      });

      const attendanceRate = totalAttendees > 0 ? (attendedCount / totalAttendees) * 100 : 0;

      return {
        totalMeetings: totalMeetings || 0,
        totalParticipants: uniqueAttendees.size,
        avgDuration: `${Math.round(avgDuration / 60)}h ${Math.round(avgDuration % 60)}m`,
        attendanceRate: `${Math.round(attendanceRate)}%`,
      };
    },
  });
}