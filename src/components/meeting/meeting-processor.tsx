import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { AutoProcessingOptions, MeetingProcessingResult, MeetingProcessorService } from '@/services/meeting-processor';
import {
    CheckCircle,
    Download,
    FileAudio,
    FileText,
    Folder,
    Loader2,
    Mail,
    Send,
    Upload,
    Users,
    XCircle
} from 'lucide-react';
import React, { useCallback, useState } from 'react';

interface Recipient {
  email: string;
  name?: string;
  type: 'internal' | 'external';
}

interface Participant {
  id: string;
  name: string;
  email: string;
  organization: string;
}

export function MeetingProcessor() {
  const [file, setFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentStep, setCurrentStep] = useState('');
  const [results, setResults] = useState<MeetingProcessingResult | null>(null);
  const [recipients, setRecipients] = useState<Recipient[]>([]);
  const [newRecipientEmail, setNewRecipientEmail] = useState('');
  const [newRecipientType, setNewRecipientType] = useState<'internal' | 'external'>('internal');
  const [transcript, setTranscript] = useState('');
  const [autoProcess, setAutoProcess] = useState(false);
  const [saveToDrive, setSaveToDrive] = useState(true);
  const [selectedParticipants, setSelectedParticipants] = useState<Participant[]>([]);
  const [showParticipantSelector, setShowParticipantSelector] = useState(false);
  const [driveLink, setDriveLink] = useState<string>('');
  const { toast } = useToast();

  // Mock participants data - in real app, this would come from your contacts/participants API
  const mockParticipants: Participant[] = [
    { id: '1', name: 'John Doe', email: 'john.doe@company.com', organization: 'Tech Corp' },
    { id: '2', name: 'Jane Smith', email: 'jane.smith@company.com', organization: 'Tech Corp' },
    { id: '3', name: 'Mike Johnson', email: 'mike.johnson@company.com', organization: 'Tech Corp' },
    { id: '4', name: 'Sarah Wilson', email: 'sarah.wilson@company.com', organization: 'Tech Corp' },
    { id: '5', name: 'David Brown', email: 'david.brown@company.com', organization: 'Tech Corp' },
  ];

  const handleFileChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setResults(null);
      setTranscript('');
    }
  }, []);

  const addRecipient = useCallback(() => {
    if (newRecipientEmail && newRecipientEmail.includes('@')) {
      setRecipients(prev => [...prev, { email: newRecipientEmail, type: newRecipientType }]);
      setNewRecipientEmail('');
    }
  }, [newRecipientEmail, newRecipientType]);

  const removeRecipient = useCallback((index: number) => {
    setRecipients(prev => prev.filter((_, i) => i !== index));
  }, []);

  const processMeeting = useCallback(async () => {
    if (!file) {
      toast({
        title: "No file selected",
        description: "Please select an audio or video file to process.",
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true);
    setProgress(0);
    setCurrentStep('Uploading file...');

    try {
      // Simulate progress updates
      const progressInterval = setInterval(() => {
        setProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return prev;
          }
          return prev + 10;
        });
      }, 1000);

      setCurrentStep('Transcribing audio...');
      
      let result: MeetingProcessingResult;
      
      if (autoProcess) {
        // Use automatic processing with participants and drive save
        const autoOptions: AutoProcessingOptions = {
          autoSendEmails: selectedParticipants.length > 0,
          saveToDrive: saveToDrive,
          participants: selectedParticipants.map(p => ({
            email: p.email,
            name: p.name,
            type: 'internal' as const
          }))
        };
        
        const autoResult = await MeetingProcessorService.autoProcessMeeting(file, autoOptions);
        
        if (autoResult.success) {
          result = autoResult.results!;
          setDriveLink(autoResult.driveLink || '');
          
          if (autoResult.emailResults) {
            const successCount = autoResult.emailResults.filter(r => r).length;
            toast({
              title: "Automatic processing complete",
              description: `Meeting processed, saved to drive, and emails sent to ${successCount} participants!`,
            });
          }
        } else {
          throw new Error(autoResult.error);
        }
      } else {
        // Use regular processing
        result = await MeetingProcessorService.processMeetingAudio(file);
      }
      
      clearInterval(progressInterval);
      setProgress(100);
      setCurrentStep('Processing complete!');

      if (result.success) {
        setResults(result);
        setTranscript(result.formattedTranscript || '');
        if (!autoProcess) {
          toast({
            title: "Processing complete",
            description: "Meeting minutes generated successfully!",
          });
        }
      } else {
        toast({
          title: "Processing failed",
          description: result.error || "An error occurred during processing.",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "An unexpected error occurred.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  }, [file, autoProcess, selectedParticipants, saveToDrive, toast]);

  const shareMeeting = useCallback(async () => {
    if (!results?.success || !file) {
      toast({
        title: "No results to share",
        description: "Please process a meeting first.",
        variant: "destructive",
      });
      return;
    }

    if (recipients.length === 0) {
      toast({
        title: "No recipients",
        description: "Please add at least one recipient.",
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true);
    setCurrentStep('Sharing meeting minutes...');

    try {
      const workflowResult = await MeetingProcessorService.completeMeetingWorkflow(file, recipients);
      
      if (workflowResult.success) {
        toast({
          title: "Meeting shared successfully",
          description: `Meeting minutes sent to ${recipients.length} recipient(s).`,
        });
        setRecipients([]);
      } else {
        toast({
          title: "Sharing failed",
          description: workflowResult.error || "Failed to share meeting minutes.",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "An unexpected error occurred.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  }, [results, file, recipients, toast]);

  const downloadPDF = useCallback(() => {
    if (results?.minutesOfMeeting) {
      MeetingProcessorService.downloadMeetingMinutes(results.minutesOfMeeting);
      toast({
        title: "PDF downloaded",
        description: "Meeting minutes PDF has been downloaded.",
      });
    }
  }, [results, toast]);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* File Upload Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileAudio className="h-5 w-5" />
            Upload Meeting Audio/Video
          </CardTitle>
          <CardDescription>
            Upload an audio or video file to generate meeting minutes
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid w-full max-w-sm items-center gap-1.5">
            <Label htmlFor="audio-file">Audio/Video File</Label>
            <Input
              id="audio-file"
              type="file"
              accept="audio/*,video/*"
              onChange={handleFileChange}
              disabled={isProcessing}
            />
          </div>

          {/* Automatic Processing Options */}
          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="auto-process"
                checked={autoProcess}
                onChange={(e) => setAutoProcess(e.target.checked)}
                className="rounded"
              />
              <Label htmlFor="auto-process">Enable automatic processing</Label>
            </div>
            
            {autoProcess && (
              <div className="space-y-3 pl-6 border-l-2 border-muted">
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="save-to-drive"
                    checked={saveToDrive}
                    onChange={(e) => setSaveToDrive(e.target.checked)}
                    className="rounded"
                  />
                  <Label htmlFor="save-to-drive">Save to Google Drive</Label>
                </div>
                
                <div className="space-y-2">
                  <Label>Select Meeting Participants</Label>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setShowParticipantSelector(true)}
                    >
                      <Users className="h-4 w-4 mr-2" />
                      Select Participants
                    </Button>
                    {selectedParticipants.length > 0 && (
                      <Badge variant="secondary">
                        {selectedParticipants.length} selected
                      </Badge>
                    )}
                  </div>
                  
                  {selectedParticipants.length > 0 && (
                    <div className="space-y-1">
                      {selectedParticipants.map((participant, index) => (
                        <div key={participant.id} className="flex items-center justify-between p-2 bg-muted rounded">
                          <div>
                            <div className="font-medium">{participant.name}</div>
                            <div className="text-sm text-muted-foreground">{participant.email}</div>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setSelectedParticipants(prev => prev.filter((_, i) => i !== index))}
                          >
                            <XCircle className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
          
          {file && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Upload className="h-4 w-4" />
              {file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)
            </div>
          )}

          <Button 
            onClick={processMeeting} 
            disabled={!file || isProcessing}
            className="w-full"
          >
            {isProcessing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <FileText className="mr-2 h-4 w-4" />
                Process Meeting
              </>
            )}
          </Button>

          {isProcessing && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>{currentStep}</span>
                <span>{progress}%</span>
              </div>
              <Progress value={progress} className="w-full" />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Results Section */}
      {results && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-500" />
              Meeting Minutes Generated
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {results.minutesOfMeeting && (
              <div className="space-y-2">
                <h3 className="font-semibold">{results.minutesOfMeeting.title}</h3>
                <div className="flex gap-2">
                  <Badge variant="outline">{results.minutesOfMeeting.date}</Badge>
                  <Badge variant="outline">{results.minutesOfMeeting.time}</Badge>
                </div>
                {results.summary && (
                  <Alert>
                    <AlertDescription>{results.summary}</AlertDescription>
                  </Alert>
                )}
              </div>
            )}

            <div className="flex gap-2">
              <Button onClick={downloadPDF} variant="outline">
                <Download className="mr-2 h-4 w-4" />
                Download PDF
              </Button>
              {driveLink && (
                <Button 
                  variant="outline" 
                  onClick={() => window.open(driveLink, '_blank')}
                >
                  <Folder className="mr-2 h-4 w-4" />
                  View in Drive
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Transcript Section */}
      {transcript && (
        <Card>
          <CardHeader>
            <CardTitle>Transcript</CardTitle>
            <CardDescription>Generated transcript with speaker diarization</CardDescription>
          </CardHeader>
          <CardContent>
            <Textarea
              value={transcript}
              readOnly
              className="min-h-[200px] font-mono text-sm"
            />
          </CardContent>
        </Card>
      )}

      {/* Sharing Section */}
      {results?.success && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5" />
              Share Meeting Minutes
            </CardTitle>
            <CardDescription>
              Add recipients and share the meeting minutes via email
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Add Recipients */}
            <div className="space-y-2">
              <Label>Add Recipients</Label>
              <div className="flex gap-2">
                <Input
                  type="email"
                  placeholder="recipient@example.com"
                  value={newRecipientEmail}
                  onChange={(e) => setNewRecipientEmail(e.target.value)}
                  className="flex-1"
                />
                <select
                  value={newRecipientType}
                  onChange={(e) => setNewRecipientType(e.target.value as 'internal' | 'external')}
                  className="px-3 py-2 border rounded-md"
                >
                  <option value="internal">Internal</option>
                  <option value="external">External</option>
                </select>
                <Button onClick={addRecipient} size="sm">
                  Add
                </Button>
              </div>
            </div>

            {/* Recipients List */}
            {recipients.length > 0 && (
              <div className="space-y-2">
                <Label>Recipients ({recipients.length})</Label>
                <div className="space-y-2">
                  {recipients.map((recipient, index) => (
                    <div key={index} className="flex items-center justify-between p-2 border rounded-md">
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4" />
                        <span>{recipient.email}</span>
                        <Badge variant={recipient.type === 'internal' ? 'default' : 'secondary'}>
                          {recipient.type}
                        </Badge>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeRecipient(index)}
                      >
                        <XCircle className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <Separator />

            <Button 
              onClick={shareMeeting} 
              disabled={recipients.length === 0 || isProcessing}
              className="w-full"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Sharing...
                </>
              ) : (
                <>
                  <Send className="mr-2 h-4 w-4" />
                  Share Meeting Minutes
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Participant Selector Dialog */}
      <Dialog open={showParticipantSelector} onOpenChange={setShowParticipantSelector}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Select Meeting Participants</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="max-h-96 overflow-y-auto space-y-2">
              {mockParticipants.map((participant) => {
                const isSelected = selectedParticipants.some(p => p.id === participant.id);
                return (
                  <div
                    key={participant.id}
                    className={`flex items-center justify-between p-3 border rounded-lg cursor-pointer transition-colors ${
                      isSelected ? 'bg-primary/10 border-primary' : 'hover:bg-muted'
                    }`}
                    onClick={() => {
                      if (isSelected) {
                        setSelectedParticipants(prev => prev.filter(p => p.id !== participant.id));
                      } else {
                        setSelectedParticipants(prev => [...prev, participant]);
                      }
                    }}
                  >
                    <div className="flex items-center space-x-3">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => {}} // Handled by parent div onClick
                        className="rounded"
                      />
                      <div>
                        <div className="font-medium">{participant.name}</div>
                        <div className="text-sm text-muted-foreground">{participant.email}</div>
                        <div className="text-xs text-muted-foreground">{participant.organization}</div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="flex justify-between items-center">
              <div className="text-sm text-muted-foreground">
                {selectedParticipants.length} participants selected
              </div>
              <div className="space-x-2">
                <Button
                  variant="outline"
                  onClick={() => setShowParticipantSelector(false)}
                >
                  Cancel
                </Button>
                <Button
                  onClick={() => setShowParticipantSelector(false)}
                >
                  Confirm Selection
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
