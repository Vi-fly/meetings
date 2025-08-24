import { useCallback, useState } from 'react';
import { EmailRecipient, MeetingInvitation, momService } from '../services/mom-service';
import { useToast } from './use-toast';

export interface MeetingInvitationState {
  isSendingInvitations: boolean;
  isSendingMom: boolean;
  recipients: EmailRecipient[];
  error: string | null;
  lastSentCount: number;
  failedEmails: string[];
}

export interface MeetingInvitationActions {
  sendMeetingInvitations: (invitation: MeetingInvitation) => Promise<void>;
  sendMomEmail: (recipients: EmailRecipient[], mom: any, summary: string, transcript: string) => Promise<void>;
  addRecipient: (recipient: EmailRecipient) => void;
  removeRecipient: (index: number) => void;
  updateRecipient: (index: number, recipient: EmailRecipient) => void;
  clearRecipients: () => void;
  reset: () => void;
}

export function useMeetingInvitations(): [MeetingInvitationState, MeetingInvitationActions] {
  const { toast } = useToast();
  const [state, setState] = useState<MeetingInvitationState>({
    isSendingInvitations: false,
    isSendingMom: false,
    recipients: [],
    error: null,
    lastSentCount: 0,
    failedEmails: [],
  });

  const reset = useCallback(() => {
    setState({
      isSendingInvitations: false,
      isSendingMom: false,
      recipients: [],
      error: null,
      lastSentCount: 0,
      failedEmails: [],
    });
  }, []);

  const sendMeetingInvitations = useCallback(async (invitation: MeetingInvitation) => {
    if (!invitation.attendees || invitation.attendees.length === 0) {
      toast({
        title: "No Attendees",
        description: "Please add at least one attendee to send invitations.",
        variant: "destructive",
      });
      return;
    }

    setState(prev => ({ ...prev, isSendingInvitations: true, error: null }));
    
    try {
      const success = await momService.sendMeetingInvitations(invitation);
      
      if (!success) {
        throw new Error('Failed to send meeting invitations. Please try again.');
      }

      setState(prev => ({
        ...prev,
        isSendingInvitations: false,
        lastSentCount: invitation.attendees.length,
      }));

      toast({
        title: "Invitations Sent",
        description: `Meeting invitations sent to ${invitation.attendees.length} attendee(s).`,
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to send invitations';
      setState(prev => ({ 
        ...prev, 
        isSendingInvitations: false, 
        error: errorMessage 
      }));
      
      toast({
        title: "Invitation Failed",
        description: errorMessage,
        variant: "destructive",
      });
    }
  }, [toast]);

  const sendMomEmail = useCallback(async (
    recipients: EmailRecipient[],
    mom: any,
    summary: string,
    transcript: string
  ) => {
    if (!recipients || recipients.length === 0) {
      toast({
        title: "No Recipients",
        description: "Please add at least one recipient to send the MoM.",
        variant: "destructive",
      });
      return;
    }

    setState(prev => ({ ...prev, isSendingMom: true, error: null }));
    
    try {
      const success = await momService.sendMomEmail(recipients, mom, summary, transcript);
      
      if (!success) {
        throw new Error('Failed to send MoM email. Please try again.');
      }

      setState(prev => ({
        ...prev,
        isSendingMom: false,
        lastSentCount: recipients.length,
      }));

      toast({
        title: "MoM Sent",
        description: `Minutes of Meeting sent to ${recipients.length} recipient(s).`,
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to send MoM';
      setState(prev => ({ 
        ...prev, 
        isSendingMom: false, 
        error: errorMessage 
      }));
      
      toast({
        title: "MoM Sending Failed",
        description: errorMessage,
        variant: "destructive",
      });
    }
  }, [toast]);

  const addRecipient = useCallback((recipient: EmailRecipient) => {
    if (!recipient.email || !recipient.email.includes('@')) {
      toast({
        title: "Invalid Email",
        description: "Please enter a valid email address.",
        variant: "destructive",
      });
      return;
    }

    // Check for duplicate emails
    const isDuplicate = state.recipients.some(r => r.email.toLowerCase() === recipient.email.toLowerCase());
    if (isDuplicate) {
      toast({
        title: "Duplicate Email",
        description: "This email address is already in the list.",
        variant: "destructive",
      });
      return;
    }

    setState(prev => ({
      ...prev,
      recipients: [...prev.recipients, recipient],
    }));

    toast({
      title: "Recipient Added",
      description: `${recipient.name || recipient.email} added to the list.`,
    });
  }, [state.recipients, toast]);

  const removeRecipient = useCallback((index: number) => {
    setState(prev => ({
      ...prev,
      recipients: prev.recipients.filter((_, i) => i !== index),
    }));
  }, []);

  const updateRecipient = useCallback((index: number, recipient: EmailRecipient) => {
    setState(prev => ({
      ...prev,
      recipients: prev.recipients.map((r, i) => i === index ? recipient : r),
    }));
  }, []);

  const clearRecipients = useCallback(() => {
    setState(prev => ({
      ...prev,
      recipients: [],
    }));
  }, []);

  const actions: MeetingInvitationActions = {
    sendMeetingInvitations,
    sendMomEmail,
    addRecipient,
    removeRecipient,
    updateRecipient,
    clearRecipients,
    reset,
  };

  return [state, actions];
}
