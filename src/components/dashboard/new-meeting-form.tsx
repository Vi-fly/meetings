import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Textarea } from "@/components/ui/textarea";
import { useMeetingInvitations } from "@/hooks/use-meeting-invitations";
import { useCreateMeeting } from "@/hooks/use-meetings";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { MeetingInvitation } from "@/services/mom-service";
import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";
import { CalendarIcon, Clock, Send, Video } from "lucide-react";
import { useState } from "react";
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

interface NewMeetingFormProps {
  onClose: () => void;
}

export function NewMeetingForm({ onClose }: NewMeetingFormProps) {
  const { toast } = useToast();
  const createMeeting = useCreateMeeting();
  const [invitationState, invitationActions] = useMeetingInvitations();
  const [selectedContacts, setSelectedContacts] = useState<Contact[]>([]);
  
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<MeetingFormData>({
    resolver: zodResolver(meetingSchema),
  });

  const selectedDate = watch("date");

  const onSubmit = async (data: MeetingFormData) => {
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

      console.log('Creating meeting with data:', {
        title: data.topic,
        description: data.description,
        scheduled_at: scheduledDateTime.toISOString(),
        duration_mins: data.duration,
        meeting_code: `MTG-${Date.now()}`,
        meeting_link: meetingLink,
        attendees,
      });

      // First, create the meeting in the database
      await createMeeting.mutateAsync({
        title: data.topic,
        description: data.description,
        scheduled_at: scheduledDateTime.toISOString(),
        duration_mins: data.duration,
        meeting_code: `MTG-${Date.now()}`,
        meeting_link: meetingLink,
        attendees,
      });

      // Then, send invitation emails if attendees are selected
      if (selectedContacts.length > 0) {
        const invitation: MeetingInvitation = {
          title: data.topic,
          date: format(data.date, 'yyyy-MM-dd'),
          time: data.time,
          venue: "Virtual Meeting", // Default venue for now
          description: data.description,
          meetingLink: meetingLink,
          organizer: "Meeting Organizer", // You can make this configurable later
          agenda: [data.description], // Convert agenda to array format
          attendees: selectedContacts.map(contact => ({
            email: contact.email,
            name: contact.name,
            type: contact.member_type,
          })),
        };

        await invitationActions.sendMeetingInvitations(invitation);
      }
      
      toast({
        title: "Meeting Created Successfully",
        description: selectedContacts.length > 0
          ? `Meeting has been saved and invitations sent to ${selectedContacts.length} attendee(s).`
          : "Meeting has been saved successfully.",
      });
      
      onClose();
    } catch (error) {
      console.error('Error creating meeting:', error);
      toast({
        title: "Error",
        description: "Failed to create meeting. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
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
                  disabled={(date) => date < new Date()}
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
            defaultValue="60"
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
        <Button type="submit" disabled={isSubmitting || createMeeting.isPending || invitationState.isSendingInvitations} className="flex-1 bg-gradient-primary">
          <Send className="h-4 w-4 mr-2" />
          {isSubmitting || createMeeting.isPending || invitationState.isSendingInvitations 
            ? (invitationState.isSendingInvitations ? "Sending Invitations..." : "Creating...") 
            : "Create & Send Invitations"}
        </Button>
      </div>
      
      {/* Show invitation status */}
      {invitationState.isSendingInvitations && (
        <div className="text-sm text-muted-foreground text-center">
          📧 Sending invitation emails to {selectedContacts.length} attendee(s)...
        </div>
      )}
      
      {invitationState.lastSentCount > 0 && (
        <div className="text-sm text-green-600 text-center">
          ✅ Successfully sent {invitationState.lastSentCount} invitation(s)!
        </div>
      )}
    </form>
  );
}