import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { MeetingCard } from "@/components/dashboard/meeting-card";
import { MeetingDetailsDialog } from "@/components/dashboard/meeting-details-dialog";
import { MeetingsManager } from "@/components/dashboard/meetings-manager";
import { MOMDialog } from "@/components/dashboard/mom-dialog";
import { NewMeetingFAB } from "@/components/dashboard/new-meeting-fab";
import { NewMeetingForm } from "@/components/dashboard/new-meeting-form";
import { OrganizationsManager } from "@/components/dashboard/organizations-manager";
import { ParticipantsManager } from "@/components/dashboard/participants-manager";
import { StatsCard } from "@/components/dashboard/stats-card";

import { RecentActivity } from "@/components/dashboard/recent-activity";
import { AIProcessingPanel } from "@/components/meeting/ai-processing-panel";
import { ContentGallery } from "@/components/meeting/content-gallery";
import { TestApiConnection } from "@/components/test-api-connection";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/hooks/use-auth";
import { useMeetingStats, useRecentMeetings } from "@/hooks/use-meetings";
import { useToast } from "@/hooks/use-toast";
import { Database } from "@/integrations/supabase/types";
import { getDisplayName } from "@/lib/utils";
import { useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { Brain, Building, Calendar, Clock, Folder, Plus, TrendingUp, Users, Wifi } from "lucide-react";
import { useState } from "react";

type Meeting = Database["public"]["Tables"]["meetings"]["Row"] & {
  meeting_attendees?: Database["public"]["Tables"]["meeting_attendees"]["Row"];
  meeting_minutes?: Database["public"]["Tables"]["meeting_minutes"]["Row"];
  meeting_videos?: Database["public"]["Tables"]["meeting_videos"]["Row"];
  blog_posts?: Database["public"]["Tables"]["blog_posts"]["Row"];
};

interface DashboardProps {
  onLogout: () => void;
}

export default function Dashboard({ onLogout }: DashboardProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { data: meetings, isLoading: meetingsLoading } = useRecentMeetings(6);
  const { data: stats, isLoading: statsLoading } = useMeetingStats();
  const [showParticipants, setShowParticipants] = useState(false);
  const [showOrganizations, setShowOrganizations] = useState(false);
  const [showAllMeetings, setShowAllMeetings] = useState(false);
  const [showMeetingDialog, setShowMeetingDialog] = useState(false);
  const [selectedMeeting, setSelectedMeeting] = useState<Meeting | null>(null);
  const [showMeetingDetails, setShowMeetingDetails] = useState(false);
  const [showApiTest, setShowApiTest] = useState(false);
  const [showMOMDialog, setShowMOMDialog] = useState(false);
  const [selectedMeetingForMOM, setSelectedMeetingForMOM] = useState<Meeting | null>(null);
  const [searchQuery, setSearchQuery] = useState("");


  // Create user object for header
  const userData = {
    name: user?.name || user?.email?.split('@')[0] || "User",
    email: user?.email || "user@example.com",
    avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=32&h=32&fit=crop&crop=face"
  };

  const handleEditMinutes = (meetingId: string) => {
    // Find the meeting with minutes
    const meetingWithMinutes = meetings?.find(m => m.id === meetingId && m.meeting_minutes);
    if (meetingWithMinutes) {
      setSelectedMeetingForMOM(meetingWithMinutes);
      setShowMOMDialog(true);
    } else {
      toast({
        title: "No Minutes Available",
        description: "Meeting minutes have not been generated yet.",
        variant: "destructive",
      });
    }
  };

  const handleSendMOM = async (meetingId: string) => {
    // Find the meeting with minutes
    const meetingWithMinutes = meetings?.find(m => m.id === meetingId && m.meeting_minutes);
    if (!meetingWithMinutes || !meetingWithMinutes.meeting_minutes) {
      toast({
        title: "No Minutes Available",
        description: "Meeting minutes have not been generated yet.",
        variant: "destructive",
      });
      return;
    }

    try {
      // Get attendees emails
      const attendees = meetingWithMinutes.meeting_attendees?.attendees as any[] || [];
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

      // Prepare form data
      const formData = new FormData();
      formData.append('recipients', JSON.stringify(attendeeEmails.map(email => ({ email, type: 'internal' }))));
      formData.append('mom', JSON.stringify(meetingWithMinutes.meeting_minutes.full_mom ? JSON.parse(meetingWithMinutes.meeting_minutes.full_mom) : {}));
      formData.append('summary', meetingWithMinutes.meeting_minutes.summary || '');
      formData.append('transcript', meetingWithMinutes.meeting_minutes.transcript || '');

      // Call email service
      const response = await fetch(`http://localhost:5000/send-mom-email`, {
        method: 'POST',
        body: formData,
      });

             if (response.ok) {
         const result = await response.json();
         if (result.success) {
           // Update the database to mark MOM as sent
           const { supabase } = await import('@/integrations/supabase/client');
           await supabase
             .from('meeting_minutes')
             .update({ mom_sent: true })
             .eq('meeting_id', meetingId);
           
           // Invalidate meetings queries to refresh the data
           queryClient.invalidateQueries({ queryKey: ["meetings"] });
           
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

  const handleSendMinutes = (meetingId: string) => {
    toast({
      title: "Minutes Sent",
      description: "Meeting minutes sent to all participants",
    });
  };

  const handleMeetingClick = (meetingData: any) => {
    // Find the actual meeting from the database data
    const actualMeeting = meetings?.find(m => m.id === meetingData.id);
    if (actualMeeting) {
      setSelectedMeeting(actualMeeting);
      setShowMeetingDetails(true);
    }
  };

  // Filter meetings based on search query
  const filteredMeetings = meetings?.filter(meeting => {
    if (!searchQuery.trim()) return true;
    
    const query = searchQuery.toLowerCase();
    const scheduledDate = new Date(meeting.scheduled_at);
    const now = new Date();
    const status = scheduledDate > now ? "upcoming" : "completed";
    
    return (
      meeting.title.toLowerCase().includes(query) ||
      meeting.description?.toLowerCase().includes(query) ||
      status.toLowerCase().includes(query)
    );
  }) || [];

  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader 
        user={userData} 
        onLogout={onLogout}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
      />
      
      <main className="container mx-auto py-8 space-y-8 animate-fade-in">
        {/* Welcome Section */}
        <div className="space-y-2">
          <h2 className="text-3xl font-bold">Welcome back, {userData.name}!</h2>
          <p className="text-muted-foreground">
            Here's what's happening with your meetings today.
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          <StatsCard
            title="Total Meetings"
            value={statsLoading ? "..." : stats?.totalMeetings || 0}
            icon={Calendar}
            trend={{ value: 12, label: "vs last month" }}
            delay={100}
          />
          <StatsCard
            title="Participants"
            value={statsLoading ? "..." : stats?.totalParticipants || 0}
            icon={Users}
            trend={{ value: 8, label: "vs last month" }}
            delay={200}
          />
          <StatsCard
            title="Avg Duration"
            value={statsLoading ? "..." : stats?.avgDuration || "0h"}
            icon={Clock}
            trend={{ value: -5, label: "vs last month" }}
            delay={300}
          />
          <StatsCard
            title="Attendance Rate"
            value={statsLoading ? "..." : stats?.attendanceRate || "0%"}
            icon={TrendingUp}
            trend={{ value: 3, label: "vs last month" }}
            gradient="gradient-success"
            delay={400}
          />
        </div>

        {/* Recent Meetings */}
        <Card className="card-gradient animate-slide-up" style={{ animationDelay: "500ms" }}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-xl">Recent Meetings</CardTitle>
              <div className="flex space-x-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="interactive-scale"
                  onClick={() => setShowAllMeetings(true)}
                >
                  <Calendar className="h-4 w-4 mr-2" />
                  View All
                </Button>
                <Button 
                  size="sm" 
                  className="btn-gradient interactive-scale"
                  onClick={() => setShowMeetingDialog(true)}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  New Meeting
                </Button>

              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {meetingsLoading ? (
                <div className="col-span-full text-center text-muted-foreground">
                  Loading meetings...
                </div>
              ) : filteredMeetings && filteredMeetings.length > 0 ? (
                filteredMeetings.map((meeting, index) => {
                  const scheduledDate = new Date(meeting.scheduled_at);
                  const attendees = meeting.meeting_attendees?.attendees as any[] || [];
                  const hasMinutes = !!meeting.meeting_minutes;
                  const now = new Date();
                  const status = scheduledDate > now ? "upcoming" : "completed";

                  // Extract meeting link from description if it exists
                  const meetingLink = meeting.description?.includes('Meeting Link:') 
                    ? meeting.description.split('Meeting Link:')[1]?.trim()
                    : undefined;

                  return (
                                         <MeetingCard
                       key={meeting.id}
                       meeting={{
                         id: meeting.id,
                         title: meeting.title,
                         date: format(scheduledDate, "yyyy-MM-dd"),
                         time: format(scheduledDate, "h:mm a"),
                         duration: `${meeting.duration_mins || 60}m`,
                         attendees: attendees.map((a, i) => ({
                           id: `${i}`,
                           name: getDisplayName(a),
                           email: a?.email || '',
                           attended: a?.attended || false,
                         })),
                         status,
                         hasMinutes,
                         meetingLink,
                       }}
                                               onEditMinutes={handleEditMinutes}
                        onSendMinutes={handleSendMOM}
                        delay={600 + index * 100}
                        onClick={handleMeetingClick}
                        momSent={meeting.meeting_minutes?.mom_sent || false}
                     />
                  );
                })
              ) : searchQuery.trim() ? (
                <div className="col-span-full text-center text-muted-foreground">
                  No meetings found matching "{searchQuery}". Try a different search term.
                </div>
              ) : (
                <div className="col-span-full text-center text-muted-foreground">
                  No meetings found. Create your first meeting!
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* AI Features Tabs */}
        <Tabs defaultValue="overview" className="w-full animate-fade-in" style={{ animationDelay: "900ms" }}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="overview" className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="ai-center" className="flex items-center gap-2">
              <Brain className="h-4 w-4" />
              AI Center
            </TabsTrigger>
            <TabsTrigger value="gallery" className="flex items-center gap-2">
              <Folder className="h-4 w-4" />
              Content Gallery
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            {/* Quick Actions */}
            <div className="grid gap-6 md:grid-cols-2">
              <Card className="card-gradient card-hover">
                <CardHeader>
                  <CardTitle>Quick Actions</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Button 
                    className="w-full justify-start btn-gradient interactive-scale"
                    onClick={() => setShowMeetingDialog(true)}
                  >
                    <Calendar className="h-4 w-4 mr-2" />
                    Schedule New Meeting
                  </Button>
                  <Button 
                    variant="outline" 
                    className="w-full justify-start interactive-scale"
                    onClick={() => setShowParticipants(true)}
                  >
                    <Users className="h-4 w-4 mr-2" />
                    View All Participants
                  </Button>
                  <Button 
                    variant="outline" 
                    className="w-full justify-start interactive-scale"
                    onClick={() => setShowOrganizations(true)}
                  >
                    <Building className="h-4 w-4 mr-2" />
                    View All Organizations
                  </Button>
                  <Button 
                    variant="outline" 
                    className="w-full justify-start interactive-scale"
                    onClick={() => setShowApiTest(true)}
                  >
                    <Wifi className="h-4 w-4 mr-2" />
                    Test API Connection
                  </Button>

                </CardContent>
              </Card>

              <RecentActivity 
                onMeetingClick={(meetingId) => {
                  const meeting = meetings?.find(m => m.id === meetingId);
                  if (meeting) {
                    setSelectedMeeting(meeting);
                    setShowMeetingDetails(true);
                  }
                }}
              />
            </div>
          </TabsContent>

          <TabsContent value="ai-center" className="space-y-6">
            <AIProcessingPanel />
          </TabsContent>

          <TabsContent value="gallery" className="space-y-6">
            <ContentGallery />
          </TabsContent>
        </Tabs>
      </main>
      
      <NewMeetingFAB onClick={() => setShowMeetingDialog(true)} />
      <ParticipantsManager 
        open={showParticipants} 
        onClose={() => setShowParticipants(false)} 
      />
      
      <OrganizationsManager 
        open={showOrganizations} 
        onClose={() => setShowOrganizations(false)} 
      />
      
      <MeetingsManager 
        open={showAllMeetings} 
        onClose={() => setShowAllMeetings(false)} 
      />
      
      {/* Meeting Creation Dialog */}
      <Dialog open={showMeetingDialog} onOpenChange={setShowMeetingDialog}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create New Meeting</DialogTitle>
          </DialogHeader>
          <NewMeetingForm onClose={() => setShowMeetingDialog(false)} />
        </DialogContent>
      </Dialog>

      {/* Meeting Details Dialog */}
      <MeetingDetailsDialog
        meeting={selectedMeeting}
        open={showMeetingDetails}
        onClose={() => {
          setShowMeetingDetails(false);
          setSelectedMeeting(null);
        }}
      />

      {/* API Test Dialog */}
      <Dialog open={showApiTest} onOpenChange={setShowApiTest}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>API Connection Test</DialogTitle>
          </DialogHeader>
          <TestApiConnection />
        </DialogContent>
      </Dialog>

      {/* MOM Dialog */}
      <MOMDialog
        meetingMinutes={selectedMeetingForMOM?.meeting_minutes || null}
        meeting={selectedMeetingForMOM}
        open={showMOMDialog}
        onClose={() => {
          setShowMOMDialog(false);
          setSelectedMeetingForMOM(null);
        }}
      />
    </div>
  );
}