import { Calendar, CheckCircle, Mail, Users } from 'lucide-react';
import { useState } from 'react';
import { useToast } from '../../hooks/use-toast';
import { MeetingInvitation } from '../../services/mom-service';
import { MeetingInvitationForm } from '../meeting/meeting-invitation-form';
import { Button } from '../ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '../ui/dialog';

interface MeetingInvitationExampleProps {
  className?: string;
}

export function MeetingInvitationExample({ className }: MeetingInvitationExampleProps) {
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [sentInvitations, setSentInvitations] = useState<MeetingInvitation[]>([]);

  const handleInvitationsSent = (invitation: MeetingInvitation) => {
    setSentInvitations(prev => [invitation, ...prev]);
    setIsDialogOpen(false);
    
    toast({
      title: "Invitations Sent Successfully",
      description: `Meeting invitations sent to ${invitation.attendees.length} attendee(s).`,
    });
  };

  return (
    <div className={className}>
      {/* Meeting Invitation Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Meeting Invitation System
          </CardTitle>
          <CardDescription>
            Send professional meeting invitations to your team and stakeholders
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">
                Create and send beautiful meeting invitations with agenda, venue details, and meeting links.
              </p>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span>• Professional HTML email templates</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span>• Support for internal and external attendees</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span>• Meeting link integration</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span>• Agenda and description support</span>
              </div>
            </div>
            
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button className="flex items-center gap-2">
                  <Mail className="h-4 w-4" />
                  Send Invitations
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Send Meeting Invitations</DialogTitle>
                  <DialogDescription>
                    Create and send meeting invitations to your attendees.
                  </DialogDescription>
                </DialogHeader>
                <MeetingInvitationForm onInvitationsSent={handleInvitationsSent} />
              </DialogContent>
            </Dialog>
          </div>
        </CardContent>
      </Card>

      {/* Recent Invitations */}
      {sentInvitations.length > 0 && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Recent Meeting Invitations</CardTitle>
            <CardDescription>
              Recently sent meeting invitations
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {sentInvitations.slice(0, 5).map((invitation, index) => (
                <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h4 className="font-medium">{invitation.title}</h4>
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    </div>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        <span>{invitation.date} at {invitation.time}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Users className="h-3 w-3" />
                        <span>{invitation.attendees.length} attendee{invitation.attendees.length !== 1 ? 's' : ''}</span>
                      </div>
                    </div>
                    {invitation.venue && (
                      <p className="text-sm text-muted-foreground">
                        📍 {invitation.venue}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm">
                      <Mail className="h-4 w-4 mr-2" />
                      Resend
                    </Button>
                    <Button variant="outline" size="sm">
                      View Details
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Mail className="h-8 w-8 text-blue-500" />
              <div>
                <p className="text-2xl font-bold">{sentInvitations.length}</p>
                <p className="text-sm text-muted-foreground">Invitations Sent</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Users className="h-8 w-8 text-green-500" />
              <div>
                <p className="text-2xl font-bold">
                  {sentInvitations.reduce((total, inv) => total + inv.attendees.length, 0)}
                </p>
                <p className="text-sm text-muted-foreground">Total Attendees</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Calendar className="h-8 w-8 text-purple-500" />
              <div>
                <p className="text-2xl font-bold">
                  {new Set(sentInvitations.map(inv => inv.date)).size}
                </p>
                <p className="text-sm text-muted-foreground">Unique Meeting Dates</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
