import { supabase } from '@/integrations/supabase/client';
import { EmailService } from './email';
import { MinutesOfMeeting, NLPService } from './nlp';
import { PDFService } from './pdf';
import { SpeechToTextService } from './speech-to-text';

export interface MeetingProcessingResult {
  success: boolean;
  transcript?: string;
  formattedTranscript?: string;
  summary?: string;
  minutesOfMeeting?: MinutesOfMeeting;
  minutesMarkdown?: string;
  pdfBuffer?: ArrayBuffer;
  error?: string;
}

export interface MeetingData {
  organizationId: string;
  meetingCode: string;
  title: string;
  scheduledAt: string;
  durationMins: number;
  description: string;
}

export interface MeetingMinuteData {
  meetingId: string;
  fullMom: string;
  summary: string;
  transcript: string;
}

export interface MeetingAttendeeData {
  meetingId: string;
  email: string;
  type: 'internal' | 'external';
  sentAt: string;
}

export interface AutoProcessingOptions {
  meetingId?: string;
  participants?: Array<{ email: string; name?: string; type: 'internal' | 'external' }>;
  autoSendEmails?: boolean;
  saveToDrive?: boolean;
  driveFolderName?: string;
}

export class MeetingProcessorService {
  /**
   * Process audio file and generate meeting minutes
   */
  static async processMeetingAudio(file: File): Promise<MeetingProcessingResult> {
    try {
      // Step 1: Transcribe audio
      console.log('Starting audio transcription...');
      const transcriptionResult = await SpeechToTextService.transcribeFile(file);
      
      if (!transcriptionResult) {
        return {
          success: false,
          error: 'Failed to transcribe audio file'
        };
      }

      // Step 2: Generate summary
      console.log('Generating meeting summary...');
      const summary = await NLPService.generateSummary(
        transcriptionResult.text,
        'Please provide a concise summary of this meeting:'
      );

      // Step 3: Generate minutes of meeting
      console.log('Generating minutes of meeting...');
      const minutesOfMeeting = await NLPService.generateMinutesOfMeeting(transcriptionResult.text);

      if (!minutesOfMeeting) {
        return {
          success: false,
          transcript: transcriptionResult.text,
          formattedTranscript: transcriptionResult.formatted,
          summary: summary || undefined,
          error: 'Failed to generate minutes of meeting'
        };
      }

      // Step 4: Format minutes as markdown
      const minutesMarkdown = NLPService.formatMinutesAsMarkdown(minutesOfMeeting);

      // Step 5: Generate PDF
      console.log('Generating PDF...');
      const pdfBuffer = PDFService.generateMinutesPDF(minutesOfMeeting);

      return {
        success: true,
        transcript: transcriptionResult.text,
        formattedTranscript: transcriptionResult.formatted,
        summary: summary || undefined,
        minutesOfMeeting,
        minutesMarkdown,
        pdfBuffer
      };

    } catch (error) {
      console.error('Error processing meeting audio:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  /**
   * Save meeting data to Supabase
   */
  static async saveMeetingData(meetingData: MeetingData): Promise<string | null> {
    try {
      const { data, error } = await supabase
        .from('meetings')
        .insert([
          {
            organization_id: meetingData.organizationId,
            meeting_code: meetingData.meetingCode,
            title: meetingData.title,
            scheduled_at: meetingData.scheduledAt,
            duration_mins: meetingData.durationMins,
            description: meetingData.description
          }
        ])
        .select('id')
        .single();

      if (error) {
        console.error('Error saving meeting data:', error);
        return null;
      }

      return data.id;
    } catch (error) {
      console.error('Error saving meeting data:', error);
      return null;
    }
  }

  /**
   * Save meeting minutes to Supabase
   */
  static async saveMeetingMinutes(minuteData: MeetingMinuteData): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('meeting_minutes')
        .insert([
          {
            meeting_id: minuteData.meetingId,
            full_mom: minuteData.fullMom,
            summary: minuteData.summary,
            transcript: minuteData.transcript
          }
        ]);

      if (error) {
        console.error('Error saving meeting minutes:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error saving meeting minutes:', error);
      return false;
    }
  }

  /**
   * Save meeting attendee data to Supabase
   */
  static async saveMeetingAttendee(attendeeData: MeetingAttendeeData): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('meeting_attendees')
        .insert([
          {
            meeting_id: attendeeData.meetingId,
            email: attendeeData.email,
            type: attendeeData.type,
            sent_at: attendeeData.sentAt
          }
        ]);

      if (error) {
        console.error('Error saving meeting attendee:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error saving meeting attendee:', error);
      return false;
    }
  }

  /**
   * Send meeting minutes via email
   */
  static async sendMeetingMinutes(
    minutesOfMeeting: MinutesOfMeeting,
    summary: string,
    minutesMarkdown: string,
    pdfBuffer: ArrayBuffer,
    recipients: Array<{ email: string; type: 'internal' | 'external' }>
  ): Promise<boolean[]> {
    const results: boolean[] = [];

    for (const recipient of recipients) {
      try {
        // Generate email template
        const htmlBody = EmailService.generateEmailTemplate({
          meetingTopic: minutesOfMeeting.title || 'Meeting',
          meetingDate: minutesOfMeeting.date || 'TBD',
          meetingTime: minutesOfMeeting.time || 'TBD',
          duration: '60 minutes', // Default duration
          speakerName: 'TBD',
          summary: summary,
          momText: minutesMarkdown,
        });

        // Send email
        const success = await EmailService.sendEmail({
          to: recipient.email,
          subject: recipient.type === 'internal' ? 'Minutes of Meeting' : 'Customized Minutes of Meeting',
          htmlBody: htmlBody,
          pdfBuffer: pdfBuffer,
          pdfFilename: 'Minutes_of_Meeting.pdf'
        });

        results.push(success);
      } catch (error) {
        console.error(`Failed to send email to ${recipient.email}:`, error);
        results.push(false);
      }
    }

    return results;
  }

  /**
   * Complete meeting processing workflow
   */
  static async completeMeetingWorkflow(
    file: File,
    recipients: Array<{ email: string; type: 'internal' | 'external' }>
  ): Promise<{
    success: boolean;
    meetingId?: string;
    results?: MeetingProcessingResult;
    emailResults?: boolean[];
    error?: string;
  }> {
    try {
      // Process the audio file
      const processingResult = await this.processMeetingAudio(file);
      
      if (!processingResult.success) {
        return {
          success: false,
          error: processingResult.error
        };
      }

      // Save meeting data
      const meetingData: MeetingData = {
        organizationId: "9a6ac03d-2a3e-42b3-9e1d-1047055cd7a9", // Default org ID
        meetingCode: "AUTO-" + new Date().toISOString().replace(/[-:]/g, '').split('.')[0],
        title: processingResult.minutesOfMeeting?.title || "Automated Meeting",
        scheduledAt: new Date().toISOString(),
        durationMins: 60,
        description: "Meeting created by automation"
      };

      const meetingId = await this.saveMeetingData(meetingData);
      
      if (meetingId && processingResult.minutesOfMeeting && processingResult.summary) {
        // Save meeting minutes
        const minuteData: MeetingMinuteData = {
          meetingId,
          fullMom: processingResult.minutesMarkdown || '',
          summary: processingResult.summary,
          transcript: processingResult.transcript || ''
        };
        await this.saveMeetingMinutes(minuteData);

        // Save attendee data
        for (const recipient of recipients) {
          const attendeeData: MeetingAttendeeData = {
            meetingId,
            email: recipient.email,
            type: recipient.type,
            sentAt: new Date().toISOString()
          };
          await this.saveMeetingAttendee(attendeeData);
        }

        // Send emails
        const emailResults = await this.sendMeetingMinutes(
          processingResult.minutesOfMeeting,
          processingResult.summary,
          processingResult.minutesMarkdown || '',
          processingResult.pdfBuffer!,
          recipients
        );

        return {
          success: true,
          meetingId,
          results: processingResult,
          emailResults
        };
      }

      return {
        success: false,
        error: 'Failed to save meeting data'
      };

    } catch (error) {
      console.error('Error in complete meeting workflow:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  /**
   * Download meeting minutes as PDF
   */
  static downloadMeetingMinutes(minutesOfMeeting: MinutesOfMeeting, filename?: string): void {
    const pdfBuffer = PDFService.generateMinutesPDF(minutesOfMeeting);
    const defaultFilename = `${minutesOfMeeting.title || 'meeting'}_minutes.pdf`;
    PDFService.downloadPDF(pdfBuffer, filename || defaultFilename);
  }

  /**
   * Automatically process meeting audio and handle all workflows
   */
  static async autoProcessMeeting(
    file: File,
    options: AutoProcessingOptions = {}
  ): Promise<{
    success: boolean;
    meetingId?: string;
    results?: MeetingProcessingResult;
    driveLink?: string;
    emailResults?: boolean[];
    error?: string;
  }> {
    try {
      console.log('Starting automatic meeting processing...');
      
      // Step 1: Process the audio file
      const processingResult = await this.processMeetingAudio(file);
      
      if (!processingResult.success) {
        return {
          success: false,
          error: processingResult.error
        };
      }

      // Step 2: Save meeting data to database
      const meetingData: MeetingData = {
        organizationId: "9a6ac03d-2a3e-42b3-9e1d-1047055cd7a9", // Default org ID
        meetingCode: "AUTO-" + new Date().toISOString().replace(/[-:]/g, '').split('.')[0],
        title: processingResult.minutesOfMeeting?.title || "Automated Meeting",
        scheduledAt: new Date().toISOString(),
        durationMins: 60,
        description: "Meeting created by automation"
      };

      const meetingId = await this.saveMeetingData(meetingData);
      
      if (!meetingId) {
        return {
          success: false,
          error: 'Failed to save meeting data'
        };
      }

      // Step 3: Save meeting minutes
      if (processingResult.minutesOfMeeting && processingResult.summary) {
        const minuteData: MeetingMinuteData = {
          meetingId,
          fullMom: processingResult.minutesMarkdown || '',
          summary: processingResult.summary,
          transcript: processingResult.transcript || ''
        };
        await this.saveMeetingMinutes(minuteData);
      }

      let driveLink: string | undefined;
      let emailResults: boolean[] | undefined;

      // Step 4: Save to Google Drive if requested
      if (options.saveToDrive && processingResult.pdfBuffer) {
        try {
          // Google Drive upload only works in Node.js (server-side), not browser.
          if (typeof window !== "undefined") {
            throw new Error("Google Drive upload is only supported in server-side environments.");
          }
          console.log('Saving to Google Drive...');
          // Validate credentials
          if (!process.env.GDRIVE_CLIENT_ID || !process.env.GDRIVE_CLIENT_SECRET || !process.env.GDRIVE_REDIRECT_URI) {
            throw new Error("Google Drive credentials missing in .env file.");
          }
          // Save PDF to disk before uploading
          const fs = require('fs');
          const path = require('path');
          const tempFileName = `${processingResult.minutesOfMeeting?.title || 'meeting'}_minutes_${Date.now()}.pdf`;
          const tempFilePath = path.join(process.cwd(), tempFileName);
          fs.writeFileSync(tempFilePath, Buffer.from(processingResult.pdfBuffer));
          // Google Drive upload logic removed.
        } catch (error) {
          // Google Drive upload logic removed.
        }
      }

      // Step 5: Send emails to participants if requested
      if (options.autoSendEmails && options.participants && options.participants.length > 0) {
        try {
          console.log('Sending emails to participants...');
          
          // Save attendee data
          for (const participant of options.participants) {
            const attendeeData: MeetingAttendeeData = {
              meetingId,
              email: participant.email,
              type: participant.type,
              sentAt: new Date().toISOString()
            };
            await this.saveMeetingAttendee(attendeeData);
          }

          // Send emails
          emailResults = await this.sendMeetingMinutes(
            processingResult.minutesOfMeeting!,
            processingResult.summary!,
            processingResult.minutesMarkdown || '',
            processingResult.pdfBuffer!,
            options.participants
          );
          
          console.log('Emails sent successfully');
        } catch (error) {
          console.error('Failed to send emails:', error);
          emailResults = options.participants.map(() => false);
        }
      }

      return {
        success: true,
        meetingId,
        results: processingResult,
        driveLink,
        emailResults
      };

    } catch (error) {
      console.error('Error in auto process meeting:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }
}
