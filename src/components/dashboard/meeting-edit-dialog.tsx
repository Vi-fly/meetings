import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Textarea } from "@/components/ui/textarea";
import { useUpdateMeeting } from "@/hooks/use-meetings";
import { useToast } from "@/hooks/use-toast";
import { Database } from "@/integrations/supabase/types";
import { cn } from "@/lib/utils";
import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";
import { CalendarIcon, Clock, Send, Video } from "lucide-react";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { ContactSelector } from "./contact-selector";

interface Contact {
  id: string;
  name: string;
  email: string;
  member_type: "internal" | "external";
  tags: any;
  status: "active" | "inactive" | null;
}

type Meeting = Database["public"]["Tables"]["meetings"]["Row"] & {
  meeting_attendees?: Database["public"]["Tables"]["meeting_attendees"]["Row"];
  meeting_minutes?: Database["public"]["Tables"]["meeting_minutes"]["Row"];
};

const meetingSchema = z.object({
  topic: z.string().min(1, "Meeting topic is required").max(100, "Topic must be less than 100 characters"),
  description: z.string().min(1, "Description is required").max(500, "Description must be less than 500 characters"),
  date: z.date({
    required_error: "Meeting date is required",
  }),
  time: z.string().min(1, "Meeting time is required"),
  duration: z.number().min(15, "Duration must be at least 15 minutes").max(480, "Duration must be less than 8 hours"),
  meetingLink: z.string().url("Please enter a valid meeting link").optional().or(z.literal("")),
});

type MeetingFormData = z.infer<typeof meetingSchema>;

interface MeetingEditDialogProps {
  meeting: Meeting | null;
  open: boolean;
  onClose: () => void;
}

export function MeetingEditDialog({ meeting, open, onClose }: MeetingEditDialogProps) {
  const { toast } = useToast();
  const updateMeeting = useUpdateMeeting();
  const [selectedContacts, setSelectedContacts] = useState<Contact[]>([]);
  
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<MeetingFormData>({
    resolver: zodResolver(meetingSchema),
  });

  const selectedDate = watch("date");

  // Prefill form when meeting changes
  useEffect(() => {
    if (meeting) {
      const scheduledDate = new Date(meeting.scheduled_at);
      const timeString = format(scheduledDate, "HH:mm");
      
      // Extract meeting link from description if it exists
      const meetingLink = meeting.description?.includes('Meeting Link:') 
        ? meeting.description.split('Meeting Link:')[1]?.trim()
        : "";

      // Extract description (description without meeting link)
      const description = meetingLink
        ? meeting.description.replace(`\n\nMeeting Link: ${meetingLink}`, '')
        : meeting.description;

      // Reset form with meeting data
      reset({
        topic: meeting.title,
        description: description || "",
        date: scheduledDate,
        time: timeString,
        duration: meeting.duration_mins,
        meetingLink: meetingLink || "",
      });

      // Set selected contacts from attendees
      const attendees = meeting.meeting_attendees?.attendees as any[] || [];
      const contacts: Contact[] = Array.isArray(attendees) ? attendees.map((attendee, index) => ({
        id: attendee.id || `attendee-${index}`,
        name: attendee.username || attendee.email || `Guest ${index + 1}`,
        email: attendee.email,
        member_type: "external" as const,
        tags: [],
        status: "active" as const,
      })) : [];

      setSelectedContacts(contacts);
    }
  }, [meeting, reset]);

  const onSubmit = async (data: MeetingFormData) => {
    if (!meeting) return;

    try {
      // Combine date and time
      const scheduledDateTime = new Date(data.date);
      const [hours, minutes] = data.time.split(':');
      scheduledDateTime.setHours(parseInt(hours), parseInt(minutes));

      // Get attendees from selected contacts
      const attendees = selectedContacts.map(contact => ({
        name: contact.name,
        email: contact.email,
      }));

      // Validate meeting link if provided
      const meetingLink = data.meetingLink?.trim() || undefined;

      // Combine description and meeting link in description
      const fullDescription = meetingLink 
        ? `${data.description}\n\nMeeting Link: ${meetingLink}`
        : data.description;

      console.log('Updating meeting with data:', {
        id: meeting.id,
        title: data.topic,
        description: fullDescription,
        scheduled_at: scheduledDateTime.toISOString(),
        duration_mins: data.duration,
        meeting_link: meetingLink,
        attendees,
      });

      await updateMeeting.mutateAsync({
        id: meeting.id,
        title: data.topic,
        description: fullDescription,
        scheduled_at: scheduledDateTime.toISOString(),
        duration_mins: data.duration,
        meeting_link: meetingLink,
        attendees,
      });
      
      toast({
        title: "Meeting Updated Successfully",
        description: "Meeting details have been updated and attendees notified.",
      });
      
      onClose();
    } catch (error) {
      console.error('Error updating meeting:', error);
      toast({
        title: "Error",
        description: "Failed to update meeting. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Meeting</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 animate-fade-in">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="topic" className="flex items-center gap-2">
                <Video className="h-4 w-4" />
                Meeting Topic
              </Label>
              <Input
                id="topic"
                placeholder="Enter meeting topic"
                {...register("topic")}
                className={cn(errors.topic && "border-destructive")}
              />
              {errors.topic && (
                <p className="text-sm text-destructive">{errors.topic.message}</p>
              )}
            </div>

                    <div className="space-y-2">
          <Label htmlFor="description">Description</Label>
          <Textarea
            id="description"
            placeholder="Describe the meeting purpose and objectives"
            className={cn("min-h-[100px]", errors.description && "border-destructive")}
            {...register("description")}
          />
          {errors.description && (
            <p className="text-sm text-destructive">{errors.description.message}</p>
          )}
        </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <CalendarIcon className="h-4 w-4" />
                  Date
                </Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !selectedDate && "text-muted-foreground",
                        errors.date && "border-destructive"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {selectedDate ? format(selectedDate, "PPP") : "Pick a date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={selectedDate}
                      onSelect={(date) => setValue("date", date!)}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
                {errors.date && (
                  <p className="text-sm text-destructive">{errors.date.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="time" className="flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Time
                </Label>
                <Input
                  id="time"
                  type="time"
                  {...register("time")}
                  className={cn(errors.time && "border-destructive")}
                />
                {errors.time && (
                  <p className="text-sm text-destructive">{errors.time.message}</p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="duration" className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Duration (minutes)
              </Label>
              <Input
                id="duration"
                type="number"
                min="15"
                max="480"
                placeholder="60"
                {...register("duration", { valueAsNumber: true })}
                className={cn(errors.duration && "border-destructive")}
              />
              {errors.duration && (
                <p className="text-sm text-destructive">{errors.duration.message}</p>
              )}
              <p className="text-xs text-muted-foreground">
                Meeting duration in minutes (15-480 minutes)
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="meetingLink" className="flex items-center gap-2">
                <Video className="h-4 w-4" />
                Meeting Link (Optional)
              </Label>
              <Input
                id="meetingLink"
                type="url"
                placeholder="https://meet.google.com/xxx-xxxx-xxx or https://zoom.us/j/xxxxx"
                {...register("meetingLink")}
                className={cn(errors.meetingLink && "border-destructive")}
              />
              {errors.meetingLink && (
                <p className="text-sm text-destructive">{errors.meetingLink.message}</p>
              )}
              <p className="text-xs text-muted-foreground">
                Add a meeting link to enable one-click joining for participants
              </p>
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <ContactSelector
                  selectedContacts={selectedContacts}
                  onContactsChange={setSelectedContacts}
                />
              </Label>
            </div>
          </div>

          <div className="flex gap-3 pt-4 border-t">
            <Button type="button" variant="outline" onClick={onClose} className="flex-1">
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting || updateMeeting.isPending} className="flex-1 bg-gradient-primary">
              <Send className="h-4 w-4 mr-2" />
              {isSubmitting || updateMeeting.isPending ? "Updating..." : "Update Meeting"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
} 