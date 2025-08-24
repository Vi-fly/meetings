import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { MeetingFile } from '@/services/file-upload-service';
import { Calendar, Clock, Users } from 'lucide-react';
import { FileUploadComponent } from './file-upload-component';

interface MeetingDetails {
  id: string;
  title: string;
  description: string;
  scheduled_at: string;
  duration_mins: number;
  attendees: string[];
}

interface FileUploadExampleProps {
  meeting: MeetingDetails;
}

export function FileUploadExample({ meeting }: FileUploadExampleProps) {
  const handleFileUploaded = (file: MeetingFile) => {
    console.log('New file uploaded:', file);
    // You can add additional logic here, such as:
    // - Updating meeting status
    // - Sending notifications
    // - Triggering transcription
    // - Updating UI state
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {/* Meeting Header */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="space-y-2">
              <CardTitle className="text-2xl">{meeting.title}</CardTitle>
              <p className="text-muted-foreground">{meeting.description}</p>
            </div>
            <Badge variant="secondary">Active</Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">{formatDate(meeting.scheduled_at)}</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">{formatTime(meeting.scheduled_at)} ({meeting.duration_mins} mins)</span>
            </div>
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">{meeting.attendees.length} attendees</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* File Upload Section */}
      <FileUploadComponent 
        meetingId={meeting.id} 
        onFileUploaded={handleFileUploaded}
      />

      {/* Additional Meeting Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Meeting Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="p-4 border rounded-lg">
              <h4 className="font-medium mb-2">Transcribe Recording</h4>
              <p className="text-sm text-muted-foreground mb-3">
                Generate transcript from uploaded audio/video files
              </p>
              <button className="text-sm text-blue-600 hover:text-blue-800">
                Start Transcription →
              </button>
            </div>
            
            <div className="p-4 border rounded-lg">
              <h4 className="font-medium mb-2">Generate Summary</h4>
              <p className="text-sm text-muted-foreground mb-3">
                Create AI-powered meeting summary
              </p>
              <button className="text-sm text-blue-600 hover:text-blue-800">
                Generate Summary →
              </button>
            </div>
            
            <div className="p-4 border rounded-lg">
              <h4 className="font-medium mb-2">Share Files</h4>
              <p className="text-sm text-muted-foreground mb-3">
                Share meeting files with attendees
              </p>
              <button className="text-sm text-blue-600 hover:text-blue-800">
                Share Files →
              </button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Example usage in a page component:
/*
import { FileUploadExample } from '@/components/dashboard/file-upload-example';

export default function MeetingPage({ params }: { params: { id: string } }) {
  // Fetch meeting details from your data source
  const meeting = {
    id: params.id,
    title: "Weekly Team Standup",
    description: "Discuss project progress and upcoming tasks",
    scheduled_at: "2024-01-15T10:00:00Z",
    duration_mins: 30,
    attendees: ["john@example.com", "jane@example.com", "bob@example.com"]
  };

  return <FileUploadExample meeting={meeting} />;
}
*/
