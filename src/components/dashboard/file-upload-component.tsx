import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import {
    deleteMeetingVideo,
    getMeetingMinutes,
    getMeetingVideos,
    uploadMeetingVideo,
    type MeetingFile,
    type MeetingMinutes
} from '@/services/file-upload-service';
import {
    ExternalLink,
    FileVideo,
    Trash2,
    Upload
} from 'lucide-react';
import React, { useEffect, useState } from 'react';

interface FileUploadComponentProps {
  meetingId: string;
  onFileUploaded?: (file: MeetingFile) => void;
}

export function FileUploadComponent({ meetingId, onFileUploaded }: FileUploadComponentProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [meetingFiles, setMeetingFiles] = useState<MeetingFile[]>([]);
  const [meetingMinutes, setMeetingMinutes] = useState<MeetingMinutes | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const { toast } = useToast();

  // Load existing files and minutes on component mount
  useEffect(() => {
    loadMeetingFiles();
    loadMeetingMinutes();
  }, [meetingId]);

  // Poll for meeting minutes when processing
  useEffect(() => {
    if (isProcessing) {
      const interval = setInterval(() => {
        loadMeetingMinutes();
      }, 5000); // Check every 5 seconds

      return () => clearInterval(interval);
    }
  }, [isProcessing]);

  const loadMeetingFiles = async () => {
    try {
      setIsLoading(true);
      const files = await getMeetingVideos(meetingId);
      setMeetingFiles(files);
    } catch (error) {
      console.error('Failed to load meeting files:', error);
      toast({
        title: "Error",
        description: "Failed to load meeting files",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const loadMeetingMinutes = async () => {
    try {
      const minutes = await getMeetingMinutes(meetingId);
      setMeetingMinutes(minutes);
      
      // Stop processing if we have minutes
      if (minutes && isProcessing) {
        setIsProcessing(false);
        toast({
          title: "✅ Processing Complete",
          description: "Transcript and MoM have been generated successfully!",
        });
      }
    } catch (error) {
      console.error('Failed to load meeting minutes:', error);
      // Don't show error toast for this as it's expected when no minutes exist yet
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    const allowedTypes = ['video/mp4', 'video/avi', 'video/mov', 'video/mkv', 'audio/mp3', 'audio/wav', 'audio/m4a'];
    if (!allowedTypes.includes(file.type)) {
      toast({
        title: "Invalid file type",
        description: "Please select a video or audio file",
        variant: "destructive",
      });
      return;
    }

    // Validate file size (100MB limit)
    if (file.size > 100 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Please select a file smaller than 100MB",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsUploading(true);
      setUploadProgress(0);

      const result = await uploadMeetingVideo(
        file,
        meetingId,
        (progress) => setUploadProgress(progress)
      );

      if (result.success) {
        toast({
          title: "✅ Upload successful",
          description: "File uploaded to Google Drive. Starting automatic transcription and MoM generation...",
        });
        
        // Reload files to show the new upload
        await loadMeetingFiles();
        
        // Start processing status
        setIsProcessing(true);
        
        // Call callback if provided
        if (onFileUploaded && result.driveFileId) {
          const newFile: MeetingFile = {
            meeting_id: meetingId,
            drive_share_link: `https://drive.google.com/file/d/${result.driveFileId}/view`,
            original_filename: file.name,
            uploaded_at: new Date().toISOString(),
          };
          onFileUploaded(newFile);
        }
      } else {
        toast({
          title: "❌ Upload failed",
          description: result.error || "Unknown error occurred. Please try again.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Upload error:', error);
      toast({
        title: "Upload failed",
        description: error instanceof Error ? error.message : "Unknown error occurred",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
      // Reset file input
      event.target.value = '';
    }
  };

  const handleDeleteFile = async (file: MeetingFile) => {
    try {
      // Extract file ID from Google Drive URL
      const fileId = file.drive_share_link.split('/d/')[1]?.split('/')[0];
      if (!fileId) {
        throw new Error('Invalid file ID');
      }

      const success = await deleteMeetingVideo(fileId);
      if (success) {
        toast({
          title: "File deleted",
          description: "File removed from Google Drive",
        });
        await loadMeetingFiles();
      } else {
        throw new Error('Failed to delete file');
      }
    } catch (error) {
      console.error('Delete error:', error);
      toast({
        title: "Delete failed",
        description: error instanceof Error ? error.message : "Unknown error occurred",
        variant: "destructive",
      });
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="space-y-6">
      {/* Upload Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Upload Meeting File
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <Button
                variant="outline"
                onClick={() => document.getElementById('file-upload')?.click()}
                disabled={isUploading}
                className="flex items-center gap-2"
              >
                <Upload className="h-4 w-4" />
                Select File
              </Button>
              <input
                id="file-upload"
                type="file"
                accept="video/*,audio/*"
                onChange={handleFileUpload}
                className="hidden"
                disabled={isUploading}
              />
                          {isUploading && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                Processing...
              </div>
            )}
            </div>

            {isUploading && (
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>
                    {uploadProgress === 0 ? 'Initializing...' : 
                     uploadProgress < 100 ? 'Uploading to Google Drive...' : 
                     'Finalizing...'}
                  </span>
                  <span>{uploadProgress}%</span>
                </div>
                <Progress value={uploadProgress} className="w-full" />
                {uploadProgress === 100 && (
                  <div className="text-xs text-muted-foreground">
                    Saving file information to database...
                  </div>
                )}
              </div>
            )}

            <div className="text-sm text-muted-foreground">
              <p>Supported formats: MP4, AVI, MOV, MKV, MP3, WAV, M4A</p>
              <p>Maximum file size: 100MB</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Files List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileVideo className="h-5 w-5" />
            Meeting Files ({meetingFiles.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="text-muted-foreground">Loading files...</div>
            </div>
          ) : meetingFiles.length === 0 ? (
            <div className="flex items-center justify-center py-8">
              <div className="text-center text-muted-foreground">
                <FileVideo className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>No files uploaded yet</p>
                <p className="text-sm">Upload a file to get started</p>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {meetingFiles.map((file, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <FileVideo className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{file.original_filename}</p>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <span>{formatDate(file.uploaded_at)}</span>
                        {file.uploaded_by && (
                          <>
                            <span>•</span>
                            <span>by {file.uploaded_by}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">
                      {file.original_filename.split('.').pop()?.toUpperCase() || 'FILE'}
                    </Badge>
                    
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => window.open(file.drive_share_link, '_blank')}
                      className="flex items-center gap-1"
                    >
                      <ExternalLink className="h-4 w-4" />
                      View
                    </Button>
                    
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteFile(file)}
                      className="flex items-center gap-1 text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                      Delete
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Meeting Minutes Section */}
      {(meetingMinutes || isProcessing) && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileVideo className="h-5 w-5" />
              Meeting Minutes & Transcript
              {isProcessing && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                  Processing...
                </div>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isProcessing && !meetingMinutes ? (
              <div className="space-y-4">
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                  <p className="text-muted-foreground">Generating transcript and MoM...</p>
                  <p className="text-sm text-muted-foreground">This may take a few minutes depending on the file size.</p>
                </div>
              </div>
            ) : meetingMinutes ? (
              <div className="space-y-6">
                {/* Summary */}
                {meetingMinutes.summary && (
                  <div>
                    <h4 className="font-medium mb-2">Summary</h4>
                    <p className="text-sm text-muted-foreground bg-muted p-3 rounded-lg">
                      {meetingMinutes.summary}
                    </p>
                  </div>
                )}

                {/* MoM Details */}
                {meetingMinutes.full_mom && (
                  <div>
                    <h4 className="font-medium mb-2">Minutes of Meeting</h4>
                    <div className="space-y-3">
                      {meetingMinutes.full_mom.title && (
                        <div>
                          <span className="font-medium">Title:</span> {meetingMinutes.full_mom.title}
                        </div>
                      )}
                      {meetingMinutes.full_mom.date && (
                        <div>
                          <span className="font-medium">Date:</span> {meetingMinutes.full_mom.date}
                        </div>
                      )}
                      {meetingMinutes.full_mom.attendees && (
                        <div>
                          <span className="font-medium">Attendees:</span>
                          <ul className="list-disc list-inside mt-1 text-sm text-muted-foreground">
                            {meetingMinutes.full_mom.attendees.map((attendee: string, index: number) => (
                              <li key={index}>{attendee}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {meetingMinutes.full_mom.actions && (
                        <div>
                          <span className="font-medium">Action Items:</span>
                          <ul className="list-disc list-inside mt-1 text-sm text-muted-foreground">
                            {meetingMinutes.full_mom.actions.map((action: string, index: number) => (
                              <li key={index}>{action}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Transcript */}
                {meetingMinutes.transcript && (
                  <div>
                    <h4 className="font-medium mb-2">Full Transcript</h4>
                    <div className="max-h-60 overflow-y-auto bg-muted p-3 rounded-lg">
                      <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                        {meetingMinutes.transcript}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            ) : null}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
