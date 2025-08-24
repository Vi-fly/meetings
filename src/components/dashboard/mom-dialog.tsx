import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { Database } from "@/integrations/supabase/types";
import {
    Brain,
    Calendar,
    CheckCircle,
    Clock,
    FileText,
    List,
    MessageSquare,
    Target,
    Users
} from "lucide-react";

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
  // Function to parse and format meeting minutes
  const parseMeetingMinutes = (fullMom: string): MeetingMinutesData | null => {
    try {
      return JSON.parse(fullMom);
    } catch (error) {
      console.error("Error parsing meeting minutes:", error);
      return null;
    }
  };

  if (!meetingMinutes || !meeting) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Minutes of Meeting: {meeting.title}
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100 hover:scrollbar-thumb-gray-400">
          <div className="space-y-6">
            {/* AI Summary Section */}
            {meetingMinutes.summary && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Brain className="h-5 w-5 text-blue-600" />
                    AI Summary
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-4 rounded-lg border border-blue-200">
                    <p className="text-sm text-blue-900 leading-relaxed">{meetingMinutes.summary}</p>
                  </div>
                </CardContent>
              </Card>
            )}
            
            {/* Structured Meeting Minutes */}
            {meetingMinutes.full_mom && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    Full Minutes of Meeting
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  {(() => {
                    const parsedMinutes = parseMeetingMinutes(meetingMinutes.full_mom);
                    if (!parsedMinutes) {
                      // Fallback to raw text display
                      return (
                        <div>
                          <Label className="text-sm font-medium">Raw Meeting Data</Label>
                          <Textarea
                            value={meetingMinutes.full_mom}
                            readOnly
                            className="mt-1 min-h-[200px]"
                          />
                        </div>
                      );
                    }

                    return (
                      <div className="space-y-6">
                        {/* Meeting Header */}
                        <div className="bg-gray-50 p-4 rounded-lg">
                          <div className="flex items-center gap-2 mb-3">
                            <Calendar className="h-5 w-5 text-gray-600" />
                            <h3 className="text-lg font-semibold text-gray-800">
                              {parsedMinutes.title || "Meeting Minutes"}
                            </h3>
                          </div>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                            {parsedMinutes.date && (
                              <div className="flex items-center gap-2">
                                <Calendar className="h-4 w-4 text-gray-500" />
                                <span className="text-gray-700">{parsedMinutes.date}</span>
                              </div>
                            )}
                            {parsedMinutes.time && (
                              <div className="flex items-center gap-2">
                                <Clock className="h-4 w-4 text-gray-500" />
                                <span className="text-gray-700">{parsedMinutes.time}</span>
                              </div>
                            )}
                            {parsedMinutes.attendees && (
                              <div className="flex items-center gap-2">
                                <Users className="h-4 w-4 text-gray-500" />
                                <span className="text-gray-700">{parsedMinutes.attendees.length} attendees</span>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Attendees List */}
                        {parsedMinutes.attendees && parsedMinutes.attendees.length > 0 && (
                          <div>
                            <div className="flex items-center gap-2 mb-3">
                              <Users className="h-5 w-5 text-gray-600" />
                              <Label className="text-sm font-semibold">Attendees</Label>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                              {parsedMinutes.attendees.map((attendee, index) => (
                                <div key={index} className="flex items-center gap-2 p-2 bg-gray-50 rounded">
                                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                                  <span className="text-sm text-gray-700">{attendee}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Agenda */}
                        {parsedMinutes.agenda && parsedMinutes.agenda.length > 0 && (
                          <div>
                            <div className="flex items-center gap-2 mb-3">
                              <List className="h-5 w-5 text-gray-600" />
                              <Label className="text-sm font-semibold">Agenda</Label>
                            </div>
                            <div className="space-y-2">
                              {parsedMinutes.agenda.map((item, index) => (
                                <div key={index} className="flex items-start gap-3 p-3 bg-blue-50 rounded-lg">
                                  <div className="w-6 h-6 bg-blue-600 text-white text-xs rounded-full flex items-center justify-center font-medium mt-0.5">
                                    {index + 1}
                                  </div>
                                  <span className="text-sm text-blue-900">{item}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Discussions */}
                        {parsedMinutes.discussions && parsedMinutes.discussions.length > 0 && (
                          <div>
                            <div className="flex items-center gap-2 mb-3">
                              <MessageSquare className="h-5 w-5 text-gray-600" />
                              <Label className="text-sm font-semibold">Discussions</Label>
                            </div>
                            <div className="space-y-4">
                              {parsedMinutes.discussions.map((discussion, index) => (
                                <div key={index} className="border border-gray-200 rounded-lg p-4">
                                  <h4 className="font-medium text-gray-800 mb-3">{discussion.title}</h4>
                                  <div className="space-y-2">
                                    {discussion.points.map((point, pointIndex) => (
                                      <div key={pointIndex} className="flex items-start gap-3">
                                        <div className="w-2 h-2 bg-gray-400 rounded-full mt-2 flex-shrink-0"></div>
                                        <p className="text-sm text-gray-700 leading-relaxed">{point}</p>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Action Items */}
                        {parsedMinutes.actions && parsedMinutes.actions.length > 0 && (
                          <div>
                            <div className="flex items-center gap-2 mb-3">
                              <Target className="h-5 w-5 text-gray-600" />
                              <Label className="text-sm font-semibold">Action Items</Label>
                            </div>
                            <div className="space-y-2">
                              {parsedMinutes.actions.map((action, index) => (
                                <div key={index} className="flex items-start gap-3 p-3 bg-orange-50 rounded-lg border border-orange-200">
                                  <CheckCircle className="h-4 w-4 text-orange-600 mt-0.5 flex-shrink-0" />
                                  <span className="text-sm text-orange-900">{action}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Conclusion */}
                        {parsedMinutes.conclusion && (
                          <div>
                            <div className="flex items-center gap-2 mb-3">
                              <FileText className="h-5 w-5 text-gray-600" />
                              <Label className="text-sm font-semibold">Conclusion</Label>
                            </div>
                            <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                              <p className="text-sm text-green-900 leading-relaxed">{parsedMinutes.conclusion}</p>
                            </div>
                          </div>
                        )}

                        <Separator />

                        {/* Raw Data Toggle */}
                        <details className="group">
                          <summary className="flex items-center gap-2 cursor-pointer text-sm font-medium text-gray-600 hover:text-gray-800">
                            <span className="group-open:rotate-90 transition-transform">▶</span>
                            View Raw Meeting Data
                          </summary>
                          <div className="mt-3">
                            <Textarea
                              value={meetingMinutes.full_mom}
                              readOnly
                              className="min-h-[200px] text-xs font-mono"
                            />
                          </div>
                        </details>
                      </div>
                    );
                  })()}
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        <div className="flex justify-end pt-4 border-t flex-shrink-0">
          <Button onClick={onClose} variant="outline">
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
