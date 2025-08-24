import { Calendar, Mail, Plus, Send, Users, X } from 'lucide-react';
import { useState } from 'react';
import { useMeetingInvitations } from '../../hooks/use-meeting-invitations';
import { useToast } from '../../hooks/use-toast';
import { EmailRecipient, MeetingInvitation } from '../../services/mom-service';
import { Alert, AlertDescription } from '../ui/alert';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Separator } from '../ui/separator';
import { Textarea } from '../ui/textarea';

interface MeetingInvitationFormProps {
  onInvitationsSent?: (invitation: MeetingInvitation) => void;
  className?: string;
}

export function MeetingInvitationForm({ onInvitationsSent, className }: MeetingInvitationFormProps) {
  const { toast } = useToast();
  const [invitationState, invitationActions] = useMeetingInvitations();
  
  const [formData, setFormData] = useState({
    title: '',
    date: '',
    time: '',
    venue: '',
    description: '',
    meetingLink: '',
    organizer: '',
  });

  const [newAttendee, setNewAttendee] = useState({
    name: '',
    email: '',
    type: 'internal' as const,
  });

  const [agenda, setAgenda] = useState<string[]>(['']);
  const [newAgendaItem, setNewAgendaItem] = useState('');

  const handleFormChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleAddAttendee = () => {
    if (!newAttendee.email || !newAttendee.email.includes('@')) {
      toast({
        title: "Invalid Email",
        description: "Please enter a valid email address.",
        variant: "destructive",
      });
      return;
    }

    const attendee: EmailRecipient = {
      email: newAttendee.email,
      type: newAttendee.type,
      name: newAttendee.name || newAttendee.email,
    };

    invitationActions.addRecipient(attendee);
    setNewAttendee({ name: '', email: '', type: 'internal' });
  };

  const handleRemoveAttendee = (index: number) => {
    invitationActions.removeRecipient(index);
  };

  const handleAddAgendaItem = () => {
    if (newAgendaItem.trim()) {
      setAgenda(prev => [...prev, newAgendaItem.trim()]);
      setNewAgendaItem('');
    }
  };

  const handleRemoveAgendaItem = (index: number) => {
    setAgenda(prev => prev.filter((_, i) => i !== index));
  };

  const handleSendInvitations = async () => {
    if (!formData.title || !formData.date || !formData.time) {
      toast({
        title: "Missing Required Fields",
        description: "Please fill in the meeting title, date, and time.",
        variant: "destructive",
      });
      return;
    }

    if (invitationState.recipients.length === 0) {
      toast({
        title: "No Attendees",
        description: "Please add at least one attendee to send invitations.",
        variant: "destructive",
      });
      return;
    }

    const invitation: MeetingInvitation = {
      title: formData.title,
      date: formData.date,
      time: formData.time,
      venue: formData.venue,
      description: formData.description,
      meetingLink: formData.meetingLink,
      organizer: formData.organizer,
      agenda: agenda.filter(item => item.trim()),
      attendees: invitationState.recipients,
    };

    await invitationActions.sendMeetingInvitations(invitation);
    
    if (onInvitationsSent) {
      onInvitationsSent(invitation);
    }
  };

  const isFormValid = formData.title && formData.date && formData.time && invitationState.recipients.length > 0;

  return (
    <div className={`space-y-6 ${className}`}>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Send Meeting Invitations
          </CardTitle>
          <CardDescription>
            Create and send meeting invitations to attendees
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Meeting Details */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Meeting Details
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="title">Meeting Title *</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => handleFormChange('title', e.target.value)}
                  placeholder="Enter meeting title"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="organizer">Organizer</Label>
                <Input
                  id="organizer"
                  value={formData.organizer}
                  onChange={(e) => handleFormChange('organizer', e.target.value)}
                  placeholder="Meeting organizer name"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="date">Date *</Label>
                <Input
                  id="date"
                  type="date"
                  value={formData.date}
                  onChange={(e) => handleFormChange('date', e.target.value)}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="time">Time *</Label>
                <Input
                  id="time"
                  type="time"
                  value={formData.time}
                  onChange={(e) => handleFormChange('time', e.target.value)}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="venue">Venue</Label>
                <Input
                  id="venue"
                  value={formData.venue}
                  onChange={(e) => handleFormChange('venue', e.target.value)}
                  placeholder="Meeting location or virtual platform"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="meetingLink">Meeting Link</Label>
                <Input
                  id="meetingLink"
                  value={formData.meetingLink}
                  onChange={(e) => handleFormChange('meetingLink', e.target.value)}
                  placeholder="Zoom, Teams, or other meeting link"
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => handleFormChange('description', e.target.value)}
                placeholder="Meeting description and objectives"
                rows={3}
              />
            </div>
          </div>

          <Separator />

          {/* Agenda */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Agenda Items</h3>
            
            <div className="space-y-2">
              {agenda.map((item, index) => (
                <div key={index} className="flex items-center gap-2">
                  <Input
                    value={item}
                    onChange={(e) => {
                      const newAgenda = [...agenda];
                      newAgenda[index] = e.target.value;
                      setAgenda(newAgenda);
                    }}
                    placeholder={`Agenda item ${index + 1}`}
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleRemoveAgendaItem(index)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              
              <div className="flex items-center gap-2">
                <Input
                  value={newAgendaItem}
                  onChange={(e) => setNewAgendaItem(e.target.value)}
                  placeholder="Add new agenda item"
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      handleAddAgendaItem();
                    }
                  }}
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleAddAgendaItem}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>

          <Separator />

          {/* Attendees */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <Users className="h-4 w-4" />
              Attendees
            </h3>
            
            <div className="space-y-2">
              {invitationState.recipients.map((attendee, index) => (
                <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <div>
                      <p className="font-medium">{attendee.name || attendee.email}</p>
                      <p className="text-sm text-muted-foreground">{attendee.email}</p>
                    </div>
                    <Badge variant={attendee.type === 'internal' ? 'default' : 'secondary'}>
                      {attendee.type}
                    </Badge>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRemoveAttendee(index)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
              <Input
                value={newAttendee.name}
                onChange={(e) => setNewAttendee(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Attendee name"
              />
              <Input
                value={newAttendee.email}
                onChange={(e) => setNewAttendee(prev => ({ ...prev, email: e.target.value }))}
                placeholder="Email address"
                type="email"
              />
              <select
                value={newAttendee.type}
                onChange={(e) => setNewAttendee(prev => ({ ...prev, type: e.target.value as 'internal' | 'external' }))}
                className="px-3 py-2 border rounded-md"
              >
                <option value="internal">Internal</option>
                <option value="external">External</option>
              </select>
            </div>
            
            <Button
              onClick={handleAddAttendee}
              variant="outline"
              className="flex items-center gap-2"
            >
              <Plus className="h-4 w-4" />
              Add Attendee
            </Button>
          </div>

          {/* Error Display */}
          {invitationState.error && (
            <Alert variant="destructive">
              <AlertDescription>{invitationState.error}</AlertDescription>
            </Alert>
          )}

          {/* Send Button */}
          <div className="flex justify-end">
            <Button
              onClick={handleSendInvitations}
              disabled={!isFormValid || invitationState.isSendingInvitations}
              className="flex items-center gap-2"
            >
              <Send className="h-4 w-4" />
              {invitationState.isSendingInvitations ? 'Sending...' : 'Send Invitations'}
            </Button>
          </div>

          {/* Success Message */}
          {invitationState.lastSentCount > 0 && (
            <Alert>
              <AlertDescription>
                ✅ Successfully sent {invitationState.lastSentCount} invitation(s)!
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
