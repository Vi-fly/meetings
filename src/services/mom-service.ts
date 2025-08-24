import { supabase } from '../integrations/supabase/client';

export interface MomData {
  title: string;
  date: string;
  time: string;
  attendees: string[];
  agenda: string[];
  discussions: DiscussionSection[];
  actions: string[];
  conclusion: string;
  summary: string;
  venue?: string;
  purpose?: string;
  decisions?: string[];
  action_items?: ActionItem[];
  next_steps?: string[];
  prepared_by?: string;
  preparation_date?: string;
}

export interface DiscussionSection {
  section_title?: string;
  title?: string;
  points: (string | DiscussionPoint)[];
}

export interface DiscussionPoint {
  text: string;
  subpoints?: string[];
}

export interface ActionItem {
  item: string;
  owner: string;
  status: string;
  notes: string;
}

export interface TranscriptionSegment {
  speaker: string;
  start: number;
  text: string;
}

export interface TranscriptionData {
  text: string;
  segments: TranscriptionSegment[];
}

export interface EmailRecipient {
  email: string;
  type: 'internal' | 'external';
  name?: string;
}

export interface MeetingInvitation {
  title: string;
  date: string;
  time: string;
  venue?: string;
  agenda?: string[];
  description?: string;
  meetingLink?: string;
  organizer: string;
  attendees: EmailRecipient[];
}

export class MomService {
  private apiKey: string;
  private baseUrl: string;

  constructor() {
    this.apiKey = import.meta.env.VITE_GEMINI_API_KEY || '';
    this.baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5001';
  }

  /**
   * Transcribe audio file using AssemblyAI
   */
  async transcribeAudio(file: File): Promise<TranscriptionData | null> {
    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch(`${this.baseUrl}/transcribe`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`Transcription failed: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Transcription error:', error);
      return null;
    }
  }

  /**
   * Format transcript into readable text with timestamps
   */
  formatTranscript(transcriptionData: TranscriptionData): string {
    if (!transcriptionData?.segments?.length) {
      return transcriptionData?.text || '';
    }

    return transcriptionData.segments
      .map(segment => {
        const start = segment.start / 1000;
        const minutes = Math.floor(start / 60);
        const seconds = Math.floor(start % 60);
        const timestamp = `[${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}]`;
        return `${timestamp} Speaker ${segment.speaker}: ${segment.text.trim()}`;
      })
      .join('\n');
  }

  /**
   * Generate summary from transcript
   */
  async generateSummary(transcript: string, prompt: string = "Please summarize the following transcription:"): Promise<string | null> {
    try {
      const response = await fetch(`${this.baseUrl}/generate-summary`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          transcript,
          prompt,
        }),
      });

      if (!response.ok) {
        throw new Error(`Summary generation failed: ${response.statusText}`);
      }

      const result = await response.json();
      return result.summary;
    } catch (error) {
      console.error('Summary generation error:', error);
      return null;
    }
  }

  /**
   * Generate Minutes of Meeting from transcript
   */
  async generateMinutesOfMeeting(transcript: string): Promise<MomData | null> {
    try {
      const response = await fetch(`${this.baseUrl}/generate-mom`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ transcript }),
      });

      if (!response.ok) {
        throw new Error(`MoM generation failed: ${response.statusText}`);
      }

      const result = await response.json();
      return result.mom;
    } catch (error) {
      console.error('MoM generation error:', error);
      return null;
    }
  }

  /**
   * Send meeting invitation emails to attendees
   */
  async sendMeetingInvitations(invitation: MeetingInvitation): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/send-meeting-invitations`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(invitation),
      });

      if (!response.ok) {
        throw new Error(`Invitation sending failed: ${response.statusText}`);
      }

      const result = await response.json();
      return result.success;
    } catch (error) {
      console.error('Meeting invitation error:', error);
      return false;
    }
  }

  /**
   * Send MoM via email with proper invitation format
   */
  async sendMomEmail(
    recipients: EmailRecipient[],
    mom: MomData,
    summary: string,
    transcript: string,
    pdfBlob?: Blob
  ): Promise<boolean> {
    try {
      const formData = new FormData();
      formData.append('recipients', JSON.stringify(recipients));
      formData.append('mom', JSON.stringify(mom));
      formData.append('summary', summary);
      formData.append('transcript', transcript);
      
      if (pdfBlob) {
        formData.append('pdf', pdfBlob, 'Minutes_of_Meeting.pdf');
      }

      const response = await fetch(`${this.baseUrl}/send-mom-email`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`Email sending failed: ${response.statusText}`);
      }

      return true;
    } catch (error) {
      console.error('Email sending error:', error);
      return false;
    }
  }

  /**
   * Generate PDF from MoM data
   */
  async generateMomPdf(mom: MomData): Promise<Blob | null> {
    try {
      const response = await fetch(`${this.baseUrl}/generate-pdf`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ mom }),
      });

      if (!response.ok) {
        throw new Error(`PDF generation failed: ${response.statusText}`);
      }

      return await response.blob();
    } catch (error) {
      console.error('PDF generation error:', error);
      return null;
    }
  }

  /**
   * Save meeting and MoM to database
   */
  async saveMeetingAndMom(
    meetingData: {
      organization_id: string;
      title: string;
      scheduled_at: string;
      duration_mins: number;
      description: string;
    },
    momData: {
      full_mom: string;
      summary: string;
      transcript: string;
    },
    attendees: EmailRecipient[]
  ): Promise<boolean> {
    try {
      // Save meeting
      const { data: meeting, error: meetingError } = await supabase
        .from('meetings')
        .insert([meetingData])
        .select()
        .single();

      if (meetingError) throw meetingError;

      // Save meeting minutes
      const { error: minutesError } = await supabase
        .from('meeting_minutes')
        .insert([{
          meeting_id: meeting.id,
          ...momData,
        }]);

      if (minutesError) throw minutesError;

      // Save attendees
      const attendeeData = attendees.map(attendee => ({
        meeting_id: meeting.id,
        email: attendee.email,
        type: attendee.type,
        sent_at: new Date().toISOString(),
      }));

      const { error: attendeesError } = await supabase
        .from('meeting_attendees')
        .insert(attendeeData);

      if (attendeesError) throw attendeesError;

      return true;
    } catch (error) {
      console.error('Database save error:', error);
      return false;
    }
  }

  /**
   * Format MoM as markdown
   */
  formatMomAsMarkdown(mom: MomData): string {
    const lines: string[] = [];

    // Header
    lines.push("## Minutes of Meeting (MoM)\n");
    lines.push(`**Meeting Title:** ${mom.title || 'N/A'}`);
    
    const date = mom.date || '';
    const time = mom.time || '';
    let dtLine = "";
    if (date) dtLine += date;
    if (time) dtLine += dtLine ? ` - ${time}` : time;
    if (dtLine) lines.push(`**Date & Time:** ${dtLine}`);
    
    if (mom.venue) lines.push(`**Venue:** ${mom.venue}`);

    // Attendees
    lines.push("**Attendees:**");
    if (mom.attendees?.length) {
      mom.attendees.forEach(att => lines.push(`*   ${att}`));
    } else {
      lines.push("No attendees listed.");
    }

    lines.push("---\n");

    // Purpose
    lines.push("### **1. Purpose of Meeting**");
    lines.push((mom.purpose || "No purpose specified.") + "\n");

    // Discussions
    if (mom.discussions?.length) {
      lines.push("### **2. Key Discussion Points**\n");
      mom.discussions.forEach((section, idx) => {
        const secTitle = section.section_title || section.title || `Section ${idx + 1}`;
        lines.push(`**2.${idx + 1} ${secTitle}:**\n`);
        
        section.points.forEach(point => {
          if (typeof point === 'object' && 'text' in point) {
            if (point.text) lines.push(point.text.trim() + " ");
            point.subpoints?.forEach(sp => lines.push(sp.trim() + " "));
          } else {
            lines.push((point as string).trim() + " ");
          }
        });
        lines.push(""); // blank line after each section
      });
    } else {
      lines.push("### **2. Key Discussion Points**");
      lines.push("No discussion points available.\n");
    }

    // Decisions
    lines.push("### **3. Decisions**");
    if (mom.decisions?.length) {
      mom.decisions.forEach(decision => lines.push(`*   ${decision}`));
    } else {
      lines.push("No formal decisions were made during this meeting.");
    }
    lines.push("");

    // Action Items
    if (mom.action_items?.length) {
      lines.push("### **4. Action Items**\n");
      lines.push("| Action Item | Owner | Status | Notes |");
      lines.push("| :---------- | :---- | :----- | :---- |");
      mom.action_items.forEach(action => {
        lines.push(`| ${action.item} | ${action.owner} | ${action.status} | ${action.notes} |`);
      });
      lines.push("");
    } else {
      lines.push("### **4. Action Items**");
      lines.push("No action items assigned.\n");
    }

    // Next Steps
    lines.push("### **5. Next Steps**");
    if (mom.next_steps?.length) {
      mom.next_steps.forEach(step => lines.push(`*   ${step}`));
    } else {
      lines.push("No next steps specified.");
    }
    lines.push("");

    // Footer
    lines.push("---");
    if (mom.prepared_by) lines.push(`**Minutes Prepared By:** ${mom.prepared_by}`);
    if (mom.preparation_date) lines.push(`**Date of Preparation:** ${mom.preparation_date}`);

    return lines.join('\n');
  }

  /**
   * Customize MoM for external recipients (remove sensitive information)
   */
  customizeMomForExternal(mom: MomData): MomData {
    const redacted = JSON.parse(JSON.stringify(mom)); // Deep copy
    const sensitiveKeywords = ['confidential', 'internal', 'salary', 'budget', 'secret'];

    // Filter agenda
    if (redacted.agenda?.length) {
      redacted.agenda = redacted.agenda.filter(item =>
        !sensitiveKeywords.some(keyword => item.toLowerCase().includes(keyword))
      );
    }

    // Filter discussions
    if (redacted.discussions?.length) {
      redacted.discussions = redacted.discussions.map(section => {
        const filteredPoints = section.points.filter(point => {
          if (typeof point === 'object' && 'text' in point) {
            const textLower = point.text.toLowerCase();
            if (sensitiveKeywords.some(keyword => textLower.includes(keyword))) {
              return false;
            }
            // Filter subpoints
            if (point.subpoints) {
              point.subpoints = point.subpoints.filter(sp =>
                !sensitiveKeywords.some(keyword => sp.toLowerCase().includes(keyword))
              );
            }
            return true;
          } else if (typeof point === 'string') {
            return !sensitiveKeywords.some(keyword => point.toLowerCase().includes(keyword));
          }
          return true;
        });
        return { ...section, points: filteredPoints };
      });
    }

    return redacted;
  }
}

// Export singleton instance
export const momService = new MomService();
