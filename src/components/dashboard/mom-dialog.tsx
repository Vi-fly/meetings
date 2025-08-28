import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Database } from "@/integrations/supabase/types";
import { config } from "@/services/config";
import {
    Brain,
    Calendar,
    CheckCircle,
    Clock,
    Edit,
    FileText,
    List,
    Mail,
    MessageSquare,
    Save,
    Target,
    Users,
    X
} from "lucide-react";
import { useEffect, useState } from "react";

type Meeting = Database["public"]["Tables"]["meetings"]["Row"] & {
  meeting_attendees?: Database["public"]["Tables"]["meeting_attendees"]["Row"];
  meeting_minutes?: Database["public"]["Tables"]["meeting_minutes"]["Row"];
  meeting_videos?: Database["public"]["Tables"]["meeting_videos"]["Row"];
  blog_posts?: Database["public"]["Tables"]["blog_posts"]["Row"];
};

// Interface for structured meeting minutes
interface MeetingMinutesData {
  title?: string;
  date?: string;
  time?: string;
  attendees?: string[];
  agenda?: string[];
  discussions?: Array<{
    title: string;
    points: string[];
  }>;
  actions?: string[];
  conclusion?: string;
  summary?: string;
}

interface MOMDialogProps {
  meetingMinutes: Database["public"]["Tables"]["meeting_minutes"]["Row"] | null;
  meeting: Meeting | null;
  open: boolean;
  onClose: () => void;
}

export function MOMDialog({ meetingMinutes, meeting, open, onClose }: MOMDialogProps) {
  const { toast } = useToast();
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [editedMinutes, setEditedMinutes] = useState<MeetingMinutesData | null>(null);
  const [summary, setSummary] = useState("");

  // Function to parse and format meeting minutes
  const parseMeetingMinutes = (fullMom: string): MeetingMinutesData | null => {
    try {
      // First try to parse as JSON
      return JSON.parse(fullMom);
    } catch (error) {
      console.error("Error parsing meeting minutes as JSON:", error);
      
      // If it's not JSON, it might be HTML or plain text
      // Create a fallback structure
      return {
        title: "Meeting Minutes",
        date: "",
        time: "",
        attendees: [],
        agenda: [],
        discussions: [],
        actions: [],
        conclusion: "",
        summary: ""
      };
    }
  };

  // Initialize data when dialog opens
  useEffect(() => {
    if (meetingMinutes && meeting) {
      const parsed = parseMeetingMinutes(meetingMinutes.full_mom || "");
      setEditedMinutes(parsed);
      setSummary(meetingMinutes.summary || "");
    }
  }, [meetingMinutes, meeting]);

  // Ensure we always have valid data
  useEffect(() => {
    if (!editedMinutes && meetingMinutes && meeting) {
      const parsed = parseMeetingMinutes(meetingMinutes.full_mom || "");
      setEditedMinutes(parsed);
    }
  }, [editedMinutes, meetingMinutes, meeting]);

  const handleSave = async () => {
    if (!meetingMinutes || !editedMinutes) return;

    setIsSaving(true);
    try {
      const { error } = await supabase
        .from("meeting_minutes")
        .update({
          full_mom: JSON.stringify(editedMinutes),
          summary: summary,
          updated_at: new Date().toISOString()
        })
        .eq("meeting_id", meetingMinutes.meeting_id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Meeting minutes updated successfully.",
      });
      setIsEditing(false);
    } catch (error) {
      console.error("Error saving minutes:", error);
      toast({
        title: "Error",
        description: "Failed to save meeting minutes.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    // Reset to original data
    if (meetingMinutes) {
      const parsed = parseMeetingMinutes(meetingMinutes.full_mom || "");
      setEditedMinutes(parsed);
      setSummary(meetingMinutes.summary || "");
    }
    setIsEditing(false);
  };

  const handleSendMOM = async () => {
    if (!meeting || !meetingMinutes) return;

    setIsSending(true);
    try {
      // Get attendees emails
      const attendees = meeting.meeting_attendees?.attendees as any[] || [];
      const attendeeEmails = attendees
        .map(attendee => attendee.email)
        .filter(email => email && email.trim() !== '');

      if (attendeeEmails.length === 0) {
        toast({
          title: "No Attendees Found",
          description: "No valid email addresses found for attendees.",
          variant: "destructive",
        });
        return;
      }

      // Use editedMinutes if available, otherwise try to parse the original data
      let momData = {};
      if (editedMinutes) {
        momData = editedMinutes;
      } else {
        try {
          momData = JSON.parse(meetingMinutes.full_mom || "{}");
        } catch (error) {
          console.error("Error parsing MOM data for sending:", error);
          momData = {};
        }
      }

      // Prepare form data
      const formData = new FormData();
      formData.append('recipients', JSON.stringify(attendeeEmails.map(email => ({ email, type: 'internal' }))));
      formData.append('mom', JSON.stringify(momData));
      formData.append('summary', summary || meetingMinutes.summary || '');
      formData.append('transcript', meetingMinutes.transcript || '');

      // Call email service
      const response = await fetch(`${config.BACKEND_API_URL}/send-mom-email`, {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          // Update the database to mark MOM as sent
          const { error } = await supabase
            .from('meeting_minutes')
            .update({ mom_sent: true })
            .eq('meeting_id', meeting.id);

          if (error) throw error;

          toast({
            title: "MOM Sent Successfully",
            description: `Meeting minutes sent to ${result.sent_count} out of ${result.total_count} participants.`,
          });
          
          // Close the dialog after successful send
          onClose();
        } else {
          throw new Error(result.error || 'Failed to send email');
        }
      } else {
        throw new Error('Failed to send email');
      }
    } catch (error) {
      console.error('Error sending MOM:', error);
      toast({
        title: "Error Sending MOM",
        description: "Failed to send meeting minutes. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSending(false);
    }
  };

  const updateField = (field: keyof MeetingMinutesData, value: any) => {
    if (!editedMinutes) return;
    setEditedMinutes(prev => prev ? { ...prev, [field]: value } : null);
  };

  const updateDiscussion = (index: number, field: 'title' | 'points', value: any) => {
    if (!editedMinutes?.discussions) return;
    const updatedDiscussions = [...editedMinutes.discussions];
    updatedDiscussions[index] = { ...updatedDiscussions[index], [field]: value };
    updateField('discussions', updatedDiscussions);
  };

  const addDiscussion = () => {
    if (!editedMinutes) return;
    const updatedDiscussions = [...(editedMinutes.discussions || []), { title: '', points: [''] }];
    updateField('discussions', updatedDiscussions);
  };

  const removeDiscussion = (index: number) => {
    if (!editedMinutes?.discussions) return;
    const updatedDiscussions = editedMinutes.discussions.filter((_, i) => i !== index);
    updateField('discussions', updatedDiscussions);
  };

  const addAgendaItem = () => {
    if (!editedMinutes) return;
    const updatedAgenda = [...(editedMinutes.agenda || []), ''];
    updateField('agenda', updatedAgenda);
  };

  const removeAgendaItem = (index: number) => {
    if (!editedMinutes?.agenda) return;
    const updatedAgenda = editedMinutes.agenda.filter((_, i) => i !== index);
    updateField('agenda', updatedAgenda);
  };

  const addActionItem = () => {
    if (!editedMinutes) return;
    const updatedActions = [...(editedMinutes.actions || []), ''];
    updateField('actions', updatedActions);
  };

  const removeActionItem = (index: number) => {
    if (!editedMinutes?.actions) return;
    const updatedActions = editedMinutes.actions.filter((_, i) => i !== index);
    updateField('actions', updatedActions);
  };

  const addAttendee = () => {
    if (!editedMinutes) return;
    const updatedAttendees = [...(editedMinutes.attendees || []), ''];
    updateField('attendees', updatedAttendees);
  };

  const removeAttendee = (index: number) => {
    if (!editedMinutes?.attendees) return;
    const updatedAttendees = editedMinutes.attendees.filter((_, i) => i !== index);
    updateField('attendees', updatedAttendees);
  };

  if (!meetingMinutes || !meeting) return null;

  // Use a default structure if editedMinutes is not available
  const displayMinutes = editedMinutes || {
    title: "Meeting Minutes",
    date: "",
    time: "",
    attendees: [],
    agenda: [],
    discussions: [],
    actions: [],
    conclusion: "",
    summary: ""
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Minutes of Meeting: {meeting.title}
            </DialogTitle>
            <div className="flex items-center gap-2">
              {!isEditing ? (
                <Button
                  onClick={() => setIsEditing(true)}
                  variant="outline"
                  size="sm"
                >
                  <Edit className="h-4 w-4 mr-2" />
                  Edit
                </Button>
              ) : (
                <>
                  <Button
                    onClick={handleSave}
                    disabled={isSaving}
                    size="sm"
                  >
                    <Save className="h-4 w-4 mr-2" />
                    {isSaving ? "Saving..." : "Save"}
                  </Button>
                  <Button
                    onClick={handleCancel}
                    variant="outline"
                    size="sm"
                  >
                    <X className="h-4 w-4 mr-2" />
                    Cancel
                  </Button>
                </>
              )}
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100 hover:scrollbar-thumb-gray-400">
          <div className="space-y-6">
            {/* AI Summary Section */}
            {summary && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Brain className="h-5 w-5 text-blue-600" />
                    AI Summary
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-4 rounded-lg border border-blue-200">
                    {isEditing ? (
                      <Textarea
                        value={summary}
                        onChange={(e) => setSummary(e.target.value)}
                        className="min-h-[100px] border-blue-300"
                        placeholder="Enter meeting summary..."
                      />
                    ) : (
                      <p className="text-sm text-blue-900 leading-relaxed">{summary}</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}
            
            {/* Structured Meeting Minutes */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Full Minutes of Meeting
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Meeting Header */}
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="flex items-center gap-2 mb-3">
                    <Calendar className="h-5 w-5 text-gray-600" />
                    {isEditing ? (
                      <Input
                        value={displayMinutes.title || ""}
                        onChange={(e) => updateField('title', e.target.value)}
                        placeholder="Meeting Title"
                        className="text-lg font-semibold"
                      />
                    ) : (
                      <h3 className="text-lg font-semibold text-gray-800">
                        {displayMinutes.title || "Meeting Minutes"}
                      </h3>
                    )}
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    {isEditing ? (
                      <>
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-gray-500" />
                          <Input
                            value={displayMinutes.date || ""}
                            onChange={(e) => updateField('date', e.target.value)}
                            placeholder="Date"
                            className="text-sm"
                          />
                        </div>
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4 text-gray-500" />
                          <Input
                            value={displayMinutes.time || ""}
                            onChange={(e) => updateField('time', e.target.value)}
                            placeholder="Time"
                            className="text-sm"
                          />
                        </div>
                        <div className="flex items-center gap-2">
                          <Users className="h-4 w-4 text-gray-500" />
                          <span className="text-gray-700">
                            {displayMinutes.attendees?.length || 0} attendees
                          </span>
                        </div>
                      </>
                    ) : (
                      <>
                        {displayMinutes.date && (
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-gray-500" />
                            <span className="text-gray-700">{displayMinutes.date}</span>
                          </div>
                        )}
                        {displayMinutes.time && (
                          <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4 text-gray-500" />
                            <span className="text-gray-700">{displayMinutes.time}</span>
                          </div>
                        )}
                        {displayMinutes.attendees && (
                          <div className="flex items-center gap-2">
                            <Users className="h-4 w-4 text-gray-500" />
                            <span className="text-gray-700">{displayMinutes.attendees.length} attendees</span>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>

                {/* Attendees List */}
                {displayMinutes.attendees && (
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <Users className="h-5 w-5 text-gray-600" />
                        <Label className="text-sm font-semibold">Attendees</Label>
                      </div>
                      {isEditing && (
                        <Button onClick={addAttendee} variant="outline" size="sm">
                          Add Attendee
                        </Button>
                      )}
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {displayMinutes.attendees.map((attendee, index) => (
                        <div key={index} className="flex items-center gap-2 p-2 bg-gray-50 rounded">
                          <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                          {isEditing ? (
                            <div className="flex items-center gap-2 flex-1">
                              <Input
                                value={attendee}
                                onChange={(e) => {
                                  const updatedAttendees = [...displayMinutes.attendees!];
                                  updatedAttendees[index] = e.target.value;
                                  updateField('attendees', updatedAttendees);
                                }}
                                placeholder="Attendee name"
                                className="flex-1"
                              />
                              <Button
                                onClick={() => removeAttendee(index)}
                                variant="ghost"
                                size="sm"
                                className="text-red-500 hover:text-red-700"
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                          ) : (
                            <span className="text-sm text-gray-700">{attendee}</span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Agenda */}
                {displayMinutes.agenda && (
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <List className="h-5 w-5 text-gray-600" />
                        <Label className="text-sm font-semibold">Agenda</Label>
                      </div>
                      {isEditing && (
                        <Button onClick={addAgendaItem} variant="outline" size="sm">
                          Add Item
                        </Button>
                      )}
                    </div>
                    <div className="space-y-2">
                      {displayMinutes.agenda.map((item, index) => (
                        <div key={index} className="flex items-start gap-3 p-3 bg-blue-50 rounded-lg">
                          <div className="w-6 h-6 bg-blue-600 text-white text-xs rounded-full flex items-center justify-center font-medium mt-0.5">
                            {index + 1}
                          </div>
                          {isEditing ? (
                            <div className="flex items-center gap-2 flex-1">
                              <Input
                                value={item}
                                onChange={(e) => {
                                  const updatedAgenda = [...displayMinutes.agenda!];
                                  updatedAgenda[index] = e.target.value;
                                  updateField('agenda', updatedAgenda);
                                }}
                                placeholder="Agenda item"
                                className="flex-1"
                              />
                              <Button
                                onClick={() => removeAgendaItem(index)}
                                variant="ghost"
                                size="sm"
                                className="text-red-500 hover:text-red-700"
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                          ) : (
                            <span className="text-sm text-blue-900">{item}</span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Discussions */}
                {displayMinutes.discussions && (
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <MessageSquare className="h-5 w-5 text-gray-600" />
                        <Label className="text-sm font-semibold">Discussions</Label>
                      </div>
                      {isEditing && (
                        <Button onClick={addDiscussion} variant="outline" size="sm">
                          Add Discussion
                        </Button>
                      )}
                    </div>
                    <div className="space-y-4">
                      {displayMinutes.discussions.map((discussion, index) => (
                        <div key={index} className="border border-gray-200 rounded-lg p-4">
                          {isEditing ? (
                            <div className="space-y-3">
                              <div className="flex items-center justify-between">
                                <Input
                                  value={discussion.title}
                                  onChange={(e) => updateDiscussion(index, 'title', e.target.value)}
                                  placeholder="Discussion title"
                                  className="font-medium"
                                />
                                <Button
                                  onClick={() => removeDiscussion(index)}
                                  variant="ghost"
                                  size="sm"
                                  className="text-red-500 hover:text-red-700"
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                              </div>
                              <div className="space-y-2">
                                {discussion.points.map((point, pointIndex) => (
                                  <div key={pointIndex} className="flex items-start gap-3">
                                    <div className="w-2 h-2 bg-gray-400 rounded-full mt-2 flex-shrink-0"></div>
                                    <div className="flex items-center gap-2 flex-1">
                                      <Textarea
                                        value={point}
                                        onChange={(e) => {
                                          const updatedPoints = [...discussion.points];
                                          updatedPoints[pointIndex] = e.target.value;
                                          updateDiscussion(index, 'points', updatedPoints);
                                        }}
                                        placeholder="Discussion point"
                                        className="flex-1 min-h-[60px]"
                                      />
                                      <Button
                                        onClick={() => {
                                          const updatedPoints = discussion.points.filter((_, i) => i !== pointIndex);
                                          updateDiscussion(index, 'points', updatedPoints);
                                        }}
                                        variant="ghost"
                                        size="sm"
                                        className="text-red-500 hover:text-red-700"
                                      >
                                        <X className="h-4 w-4" />
                                      </Button>
                                    </div>
                                  </div>
                                ))}
                                <Button
                                  onClick={() => {
                                    const updatedPoints = [...discussion.points, ''];
                                    updateDiscussion(index, 'points', updatedPoints);
                                  }}
                                  variant="outline"
                                  size="sm"
                                >
                                  Add Point
                                </Button>
                              </div>
                            </div>
                          ) : (
                            <>
                              <h4 className="font-medium text-gray-800 mb-3">{discussion.title}</h4>
                              <div className="space-y-2">
                                {discussion.points.map((point, pointIndex) => (
                                  <div key={pointIndex} className="flex items-start gap-3">
                                    <div className="w-2 h-2 bg-gray-400 rounded-full mt-2 flex-shrink-0"></div>
                                    <p className="text-sm text-gray-700 leading-relaxed">{point}</p>
                                  </div>
                                ))}
                              </div>
                            </>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Action Items */}
                {displayMinutes.actions && (
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <Target className="h-5 w-5 text-gray-600" />
                        <Label className="text-sm font-semibold">Action Items</Label>
                      </div>
                      {isEditing && (
                        <Button onClick={addActionItem} variant="outline" size="sm">
                          Add Action
                        </Button>
                      )}
                    </div>
                    <div className="space-y-2">
                      {displayMinutes.actions.map((action, index) => (
                        <div key={index} className="flex items-start gap-3 p-3 bg-orange-50 rounded-lg border border-orange-200">
                          <CheckCircle className="h-4 w-4 text-orange-600 mt-0.5 flex-shrink-0" />
                          {isEditing ? (
                            <div className="flex items-center gap-2 flex-1">
                              <Input
                                value={action}
                                onChange={(e) => {
                                  const updatedActions = [...displayMinutes.actions!];
                                  updatedActions[index] = e.target.value;
                                  updateField('actions', updatedActions);
                                }}
                                placeholder="Action item"
                                className="flex-1"
                              />
                              <Button
                                onClick={() => removeActionItem(index)}
                                variant="ghost"
                                size="sm"
                                className="text-red-500 hover:text-red-700"
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                          ) : (
                            <span className="text-sm text-orange-900">{action}</span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Conclusion */}
                {displayMinutes.conclusion && (
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <FileText className="h-5 w-5 text-gray-600" />
                      <Label className="text-sm font-semibold">Conclusion</Label>
                    </div>
                    <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                      {isEditing ? (
                        <Textarea
                          value={displayMinutes.conclusion}
                          onChange={(e) => updateField('conclusion', e.target.value)}
                          placeholder="Meeting conclusion"
                          className="min-h-[100px] border-green-300"
                        />
                      ) : (
                        <p className="text-sm text-green-900 leading-relaxed">{displayMinutes.conclusion}</p>
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        <div className="flex justify-between pt-4 border-t flex-shrink-0">
          <div>
            {meetingMinutes?.mom_sent && (
              <div className="flex items-center gap-2 text-sm text-green-600">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                ✓ MOM sent successfully to all participants
              </div>
            )}
          </div>
          <div className="flex gap-2">
            {!meetingMinutes?.mom_sent && (
              <Button 
                onClick={handleSendMOM}
                disabled={isSending}
                variant="default"
              >
                <Mail className="h-4 w-4 mr-2" />
                {isSending ? "Sending..." : "Send MOM"}
              </Button>
            )}
            <Button onClick={onClose} variant="outline">
              Close
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
