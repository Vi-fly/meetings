import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useMeetingDetails } from "@/hooks/use-meeting-details";
import { useToast } from "@/hooks/use-toast";
import { Database } from "@/integrations/supabase/types";
import { getDisplayName, getInitials } from "@/lib/utils";
import { config } from "@/services/config";
import { format } from "date-fns";
import {
  BarChart3,
  Calendar,
  Clock,
  Download,
  FileText,
  FileVideo,
  Globe,
  Mail,
  Play,
  Sparkles,
  Users,
  Video
} from "lucide-react";
import { useState } from "react";
import { MOMDialog } from "./mom-dialog";
import { SimpleVideoUpload } from "./simple-video-upload";

type Meeting = Database["public"]["Tables"]["meetings"]["Row"] & {
  meeting_attendees?: Database["public"]["Tables"]["meeting_attendees"]["Row"];
  meeting_minutes?: Database["public"]["Tables"]["meeting_minutes"]["Row"];
  meeting_videos?: Database["public"]["Tables"]["meeting_videos"]["Row"];
  blog_posts?: Database["public"]["Tables"]["blog_posts"]["Row"];
};

interface MeetingDetailsDialogProps {
  meeting: Meeting | null;
  open: boolean;
  onClose: () => void;
}

const MEETING_FOLDER_ID = "1SMK_vY72wrzCpE9rOjXnyBTMt29-QqJy";



export function MeetingDetailsDialog({ meeting, open, onClose }: MeetingDetailsDialogProps) {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("overview");
  const [momDialogOpen, setMomDialogOpen] = useState(false);

  // Upload progress state for video uploads
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isDriveUploading, setIsDriveUploading] = useState(false);
  const [driveProgress, setDriveProgress] = useState(0);

  // Use custom hook for meeting data
  const {
    videos: meetingVideos,
    minutes: meetingMinutes,
    blogPosts,
    isLoading,
    activityProgress,
    addVideo,
    updateMOMSent,
    isAddingVideo
  } = useMeetingDetails(meeting?.id || "");

  const handleVideoUploadComplete = async (videoData: {
    meeting_id: string;
    drive_share_link: string;
    original_filename: string;
    uploaded_by: string;
  }) => {
    try {
      await addVideo(videoData);
      toast({
        title: "Video uploaded successfully",
        description: "Meeting recording has been uploaded and is being processed",
      });
      // Reset progress state after completion
      setIsUploading(false);
      setUploadProgress(0);
      setIsDriveUploading(false);
      setDriveProgress(0);
    } catch (error) {
      console.error("Error saving video data:", error);
      toast({
        title: "Error",
        description: "Failed to save video data",
        variant: "destructive",
      });
    }
  };

  const playVideo = (driveLink: string) => {
    window.open(driveLink, '_blank');
  };

  const handleSendMOM = async () => {
    if (!meeting || !meetingMinutes) return;

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

      // Prepare email content
      const emailData = {
        to: attendeeEmails,
        subject: `Meeting Minutes: ${meeting.title}`,
        meetingTitle: meeting.title,
        meetingDate: format(new Date(meeting.scheduled_at), "MMM dd, yyyy 'at' h:mm a"),
        attendees: attendees.map(a => getDisplayName(a)),
        meetingMinutes: meetingMinutes,
        meetingDescription: meeting.description || ''
      };

      // Call email service
      const formData = new FormData();
      formData.append('recipients', JSON.stringify(attendeeEmails.map(email => ({ email, type: 'internal' }))));
      formData.append('mom', JSON.stringify(meetingMinutes.full_mom ? JSON.parse(meetingMinutes.full_mom) : {}));
      formData.append('summary', meetingMinutes.summary || '');
      formData.append('transcript', meetingMinutes.transcript || '');

      const response = await fetch(`${config.BACKEND_API_URL}/send-mom-email`, {
        method: 'POST',
        body: formData,
      });

             if (response.ok) {
         const result = await response.json();
         if (result.success) {
           // Update the database to mark MOM as sent
           await updateMOMSent();
           
           toast({
             title: "MOM Sent Successfully",
             description: `Meeting minutes sent to ${result.sent_count} out of ${result.total_count} participants.`,
           });
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
    }
  };

  const getMeetingStatus = () => {
    if (!meeting) return "unknown";
    const now = new Date();
    const meetingDate = new Date(meeting.scheduled_at);
    
    if (meetingDate > now) return "upcoming";
    if (meetingDate < now) return "completed";
    return "ongoing";
  };

  if (!meeting) return null;

  const scheduledDate = new Date(meeting.scheduled_at);
  const attendees = meeting.meeting_attendees?.attendees as any[] || [];
  const status = getMeetingStatus();

  return (
    <>
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="max-w-6xl max-h-[90vh] flex flex-col">
          <DialogHeader className="flex-shrink-0">
            <DialogTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Meeting Details: {meeting.title}
            </DialogTitle>
          </DialogHeader>

          <div className="flex flex-col gap-6 flex-1 overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100 hover:scrollbar-thumb-gray-400">
            {/* Meeting Overview */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-xl font-bold text-gray-800">{meeting.title}</CardTitle>
                  <Badge 
                    variant={status === "upcoming" ? "secondary" : status === "ongoing" ? "default" : "outline"}
                    className={`px-3 py-1 ${
                      status === "upcoming" ? "bg-blue-100 text-blue-800" :
                      status === "ongoing" ? "bg-green-100 text-green-800" :
                      "bg-gray-100 text-gray-800"
                    }`}
                  >
                    {status.charAt(0).toUpperCase() + status.slice(1)}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Meeting Details Grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                  <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg">
                    <Calendar className="h-5 w-5 text-blue-600" />
                    <div>
                      <p className="text-xs text-blue-600 font-medium">Date</p>
                      <p className="text-sm font-semibold text-blue-900">{format(scheduledDate, "MMM dd, yyyy")}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 bg-green-50 rounded-lg">
                    <Clock className="h-5 w-5 text-green-600" />
                    <div>
                      <p className="text-xs text-green-600 font-medium">Time</p>
                      <p className="text-sm font-semibold text-green-900">{format(scheduledDate, "h:mm a")}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 bg-purple-50 rounded-lg">
                    <Users className="h-5 w-5 text-purple-600" />
                    <div>
                      <p className="text-xs text-purple-600 font-medium">Attendees</p>
                      <p className="text-sm font-semibold text-purple-900">{attendees.length} people</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 bg-orange-50 rounded-lg">
                    <BarChart3 className="h-5 w-5 text-orange-600" />
                    <div>
                      <p className="text-xs text-orange-600 font-medium">Progress</p>
                      <p className="text-sm font-semibold text-orange-900">{activityProgress}% complete</p>
                    </div>
                  </div>
                </div>
                
                {/* Meeting Description */}
                {meeting.description && (
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <Label className="text-sm font-semibold text-gray-700 mb-2 block">Description</Label>
                    <p className="text-sm text-gray-600 leading-relaxed">
                      {meeting.description}
                    </p>
                  </div>
                )}

                {/* MOM Actions */}
                {meetingMinutes && (
                  <div className="space-y-3">
                    {/* Success Message */}
                    {meetingMinutes?.mom_sent && (
                      <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-md">
                        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                        <span className="text-sm font-medium text-green-800">
                          ✓ MOM sent successfully to all participants
                        </span>
                      </div>
                    )}
                    
                    {/* Action Buttons */}
                    <div className="flex gap-3">
                      <Button 
                        onClick={() => setMomDialogOpen(true)}
                        variant="outline"
                        className="flex-1"
                      >
                        <FileText className="h-4 w-4 mr-2" />
                        View Minutes
                      </Button>
                      {!meetingMinutes?.mom_sent && (
                        <Button 
                          onClick={handleSendMOM}
                          variant="default"
                          className="flex-1"
                        >
                          <Mail className="h-4 w-4 mr-2" />
                          Send MOM
                        </Button>
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Tabs */}
            <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0">
              <TabsList className="grid w-full grid-cols-3 flex-shrink-0">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="videos">Videos</TabsTrigger>
                <TabsTrigger value="blog">Blog Posts</TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="flex-1 space-y-4 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100 hover:scrollbar-thumb-gray-400">
                {/* Attendees */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Users className="h-4 w-4" />
                      Attendees ({attendees.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid gap-4">
                      {attendees.map((attendee, index) => (
                        <div key={index} className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                          <Avatar className="h-10 w-10">
                            <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white font-semibold">
                              {getInitials(getDisplayName(attendee))}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1">
                            <p className="text-sm font-semibold text-gray-800">{getDisplayName(attendee)}</p>
                            <p className="text-xs text-gray-600">{attendee.email}</p>
                          </div>
                          <Badge 
                            variant={attendee.attended ? "default" : "secondary"} 
                            className={`text-xs px-3 py-1 ${
                              attendee.attended 
                                ? "bg-green-100 text-green-800 border-green-200" 
                                : "bg-gray-100 text-gray-600 border-gray-200"
                            }`}
                          >
                            {attendee.attended ? "✓ Attended" : "○ Not Attended"}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Activity Progress */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <BarChart3 className="h-4 w-4" />
                      Activity Progress
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {/* Overall Progress */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-gray-700">Overall Progress</span>
                        <span className="text-lg font-bold text-blue-600">{activityProgress}%</span>
                      </div>
                      <Progress 
                        value={activityProgress} 
                        className="h-3 bg-gray-200" 
                        style={{
                          '--progress-background': 'linear-gradient(90deg, #3b82f6 0%, #8b5cf6 100%)'
                        } as React.CSSProperties}
                      />
                    </div>
                    
                    {/* Activity Items */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg">
                        <Video className="h-5 w-5 text-blue-600" />
                        <span className="text-sm font-medium text-blue-900">Video Recording</span>
                        <Badge 
                          variant={meetingVideos.length > 0 ? "default" : "secondary"} 
                          className={`ml-auto ${
                            meetingVideos.length > 0 
                              ? "bg-green-100 text-green-800 border-green-200" 
                              : "bg-gray-100 text-gray-600 border-gray-200"
                          }`}
                        >
                          {meetingVideos.length > 0 ? "✓ Uploaded" : "○ Pending"}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-3 p-3 bg-purple-50 rounded-lg">
                        <FileText className="h-5 w-5 text-purple-600" />
                        <span className="text-sm font-medium text-purple-900">Meeting Minutes</span>
                        <Badge 
                          variant={meetingMinutes ? "default" : "secondary"} 
                          className={`ml-auto ${
                            meetingMinutes 
                              ? "bg-green-100 text-green-800 border-green-200" 
                              : "bg-gray-100 text-gray-600 border-gray-200"
                          }`}
                        >
                          {meetingMinutes ? "✓ Generated" : "○ Pending"}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-3 p-3 bg-indigo-50 rounded-lg">
                        <Sparkles className="h-5 w-5 text-indigo-600" />
                        <span className="text-sm font-medium text-indigo-900">AI Summary</span>
                        <Badge 
                          variant={meetingMinutes?.summary ? "default" : "secondary"} 
                          className={`ml-auto ${
                            meetingMinutes?.summary 
                              ? "bg-green-100 text-green-800 border-green-200" 
                              : "bg-gray-100 text-gray-600 border-gray-200"
                          }`}
                        >
                          {meetingMinutes?.summary ? "✓ Generated" : "○ Pending"}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-3 p-3 bg-orange-50 rounded-lg">
                        <Globe className="h-5 w-5 text-orange-600" />
                        <span className="text-sm font-medium text-orange-900">Blog Posts</span>
                        <Badge 
                          variant={blogPosts.length > 0 ? "default" : "secondary"} 
                          className={`ml-auto ${
                            blogPosts.length > 0 
                              ? "bg-green-100 text-green-800 border-green-200" 
                              : "bg-gray-100 text-gray-600 border-gray-200"
                          }`}
                        >
                          {blogPosts.length > 0 ? `✓ ${blogPosts.length} Posts` : "○ None"}
                        </Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="videos" className="flex-1 space-y-4 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100 hover:scrollbar-thumb-gray-400">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Video className="h-4 w-4" />
                      Meeting Recordings
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Video Upload Component */}
                    <SimpleVideoUpload
                      meetingId={meeting.id}
                      onUploadComplete={handleVideoUploadComplete}
                      setIsUploading={setIsUploading}
                      setUploadProgress={setUploadProgress}
                      setIsDriveUploading={setIsDriveUploading}
                      setDriveProgress={setDriveProgress}
                    />

                    {/* Upload Progress Display */}
                    {(isUploading || isDriveUploading) && (
                      <div className="space-y-2 mt-2">
                        {isUploading && (
                          <>
                            <div className="flex items-center justify-between">
                              <span className="text-sm">Uploading to server...</span>
                              <span className="text-sm font-medium">{uploadProgress.toFixed(1)}%</span>
                            </div>
                            <Progress value={uploadProgress} className="h-2" />
                          </>
                        )}
                        {isDriveUploading && (
                          <>
                            <div className="flex items-center justify-between mt-2">
                              <span className="text-sm">Uploading to Google Drive...</span>
                              <span className="text-sm font-medium">{driveProgress.toFixed(1)}%</span>
                            </div>
                            <Progress value={driveProgress} className="h-2 bg-blue-100" />
                          </>
                        )}
                      </div>
                    )}

                    {/* Existing Videos from Database */}
                    {meetingVideos.length > 0 && (
                      <div className="space-y-3">
                        <h4 className="font-medium">Uploaded Videos</h4>
                        {meetingVideos.map((video, index) => (
                          <div key={index} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                            <div className="flex items-center gap-3">
                              <FileVideo className="h-4 w-4" />
                              <div>
                                <p className="text-sm font-medium">{video.original_filename}</p>
                                <p className="text-xs text-muted-foreground">
                                  Uploaded {video.uploaded_at ? format(new Date(video.uploaded_at), "MMM dd, yyyy") : "Unknown"}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => window.open(video.drive_share_link, '_blank')}
                              >
                                <Play className="h-4 w-4 mr-1" />
                                View
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => window.open(video.drive_share_link, '_blank')}
                              >
                                <Download className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="blog" className="flex-1 space-y-4 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100 hover:scrollbar-thumb-gray-400">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Globe className="h-4 w-4" />
                      Blog Posts
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {blogPosts.length > 0 ? (
                      <div className="space-y-4">
                        {blogPosts.map((post, index) => (
                          <div key={index} className="border rounded-lg p-4">
                            <h4 className="font-medium">{post.title}</h4>
                            {post.summary && (
                              <p className="text-sm text-muted-foreground mt-1">{post.summary}</p>
                            )}
                            <div className="flex items-center gap-2 mt-2">
                              <Badge variant="outline" className="text-xs">
                                {post.created_at ? format(new Date(post.created_at), "MMM dd, yyyy") : "Unknown"}
                              </Badge>
                              <Button variant="outline" size="sm">
                                View Post
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8 text-muted-foreground">
                        <Globe className="h-12 w-12 mx-auto mb-4" />
                        <p>No blog posts generated yet.</p>
                        <p className="text-sm">Blog posts will be generated from meeting content.</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>

          <div className="flex justify-end pt-4 border-t flex-shrink-0">
            <Button onClick={onClose} variant="outline">
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* MOM Dialog */}
      <MOMDialog
        meetingMinutes={meetingMinutes}
        meeting={meeting}
        open={momDialogOpen}
        onClose={() => setMomDialogOpen(false)}
      />
    </>
  );
} 