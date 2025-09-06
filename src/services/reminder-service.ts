import { supabase } from '../integrations/supabase/client';
import { config } from './config';

export interface ReminderEmailData {
  meetingTitle: string;
  meetingDate: string;
  meetingTime: string;
  duration: string;
  meetingLink?: string;
  organizerName?: string;
  attendeeName: string;
  description?: string;
}

export interface MeetingReminder {
  meeting_id: string;
  scheduled_at: string;
  reminder_sent: boolean;
  reminder_sent_at?: string;
  created_at: string;
}

export class ReminderService {
  private baseUrl: string;

  constructor() {
    this.baseUrl = config.API_BASE_URL;
  }

  /**
   * Generate HTML email template for meeting reminders
   */
  static generateReminderEmailTemplate(data: ReminderEmailData): string {
    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Meeting Reminder</title>
    <style>
        body { 
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
            line-height: 1.6; 
            color: #333; 
            margin: 0;
            padding: 0;
            background-color: #f5f7fa;
        }
        .container { 
            max-width: 600px; 
            margin: 0 auto; 
            padding: 20px; 
            background-color: #ffffff;
            border-radius: 12px;
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
        }
        .header { 
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 40px 30px;
            border-radius: 12px 12px 0 0;
            margin: -20px -20px 30px -20px;
            text-align: center;
            position: relative;
            overflow: hidden;
        }
        .header::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><defs><pattern id="grain" width="100" height="100" patternUnits="userSpaceOnUse"><circle cx="25" cy="25" r="1" fill="white" opacity="0.1"/><circle cx="75" cy="75" r="1" fill="white" opacity="0.1"/></pattern></defs><rect width="100" height="100" fill="url(%23grain)"/></svg>');
            opacity: 0.2;
        }
        .header-content {
            position: relative;
            z-index: 1;
        }
        .reminder-icon {
            font-size: 48px;
            margin-bottom: 15px;
            display: block;
        }
        h1 { 
            color: white; 
            margin: 0 0 10px 0; 
            font-size: 28px;
            font-weight: 700;
            text-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        }
        .subtitle {
            color: rgba(255, 255, 255, 0.9);
            font-size: 16px;
            margin: 0;
        }
        .meeting-card {
            background: linear-gradient(135deg, #f8f9ff 0%, #e8f2ff 100%);
            border: 2px solid #e1e8ff;
            border-radius: 12px;
            padding: 25px;
            margin: 20px 0;
            position: relative;
        }
        .meeting-card::before {
            content: '⏰';
            position: absolute;
            top: -15px;
            left: 20px;
            background: #667eea;
            color: white;
            width: 30px;
            height: 30px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 16px;
        }
        .meeting-title {
            font-size: 22px;
            font-weight: 700;
            color: #2d3748;
            margin: 0 0 15px 0;
            padding-left: 20px;
        }
        .meeting-details {
            display: grid;
            gap: 12px;
            padding-left: 20px;
        }
        .detail-row {
            display: flex;
            align-items: center;
            gap: 10px;
        }
        .detail-icon {
            width: 20px;
            height: 20px;
            display: flex;
            align-items: center;
            justify-content: center;
            background: #667eea;
            color: white;
            border-radius: 50%;
            font-size: 12px;
        }
        .detail-text {
            color: #4a5568;
            font-weight: 500;
        }
        .meeting-link {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            text-decoration: none;
            padding: 15px 25px;
            border-radius: 8px;
            display: inline-block;
            margin: 20px 0;
            font-weight: 600;
            text-align: center;
            transition: transform 0.2s ease;
        }
        .meeting-link:hover {
            transform: translateY(-2px);
            box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);
        }
        .description {
            background-color: #f7fafc;
            border-left: 4px solid #667eea;
            padding: 15px 20px;
            margin: 20px 0;
            border-radius: 0 8px 8px 0;
        }
        .description h3 {
            margin: 0 0 10px 0;
            color: #2d3748;
            font-size: 16px;
        }
        .description p {
            margin: 0;
            color: #4a5568;
            line-height: 1.5;
        }
        .footer { 
            margin-top: 30px; 
            padding: 20px; 
            background-color: #f8f9fa; 
            border-radius: 8px; 
            font-size: 14px; 
            color: #666;
            text-align: center;
        }
        .footer p {
            margin: 5px 0;
        }
        .urgent-badge {
            background: linear-gradient(135deg, #ff6b6b 0%, #ee5a52 100%);
            color: white;
            padding: 8px 16px;
            border-radius: 20px;
            font-size: 12px;
            font-weight: 600;
            display: inline-block;
            margin-bottom: 15px;
            animation: pulse 2s infinite;
        }
        @keyframes pulse {
            0% { transform: scale(1); }
            50% { transform: scale(1.05); }
            100% { transform: scale(1); }
        }
        @media (max-width: 600px) {
            .container {
                margin: 10px;
                padding: 15px;
            }
            .header {
                padding: 30px 20px;
                margin: -15px -15px 20px -15px;
            }
            h1 {
                font-size: 24px;
            }
            .meeting-title {
                font-size: 20px;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="header-content">
                <span class="reminder-icon">🔔</span>
                <h1>Meeting Reminder</h1>
                <p class="subtitle">Your meeting starts in 30 minutes</p>
            </div>
        </div>
        
        <div class="urgent-badge">⏰ Starting Soon!</div>
        
        <div class="meeting-card">
            <h2 class="meeting-title">${data.meetingTitle}</h2>
            <div class="meeting-details">
                <div class="detail-row">
                    <div class="detail-icon">📅</div>
                    <div class="detail-text"><strong>Date:</strong> ${data.meetingDate}</div>
                </div>
                <div class="detail-row">
                    <div class="detail-icon">🕐</div>
                    <div class="detail-text"><strong>Time:</strong> ${data.meetingTime}</div>
                </div>
                <div class="detail-row">
                    <div class="detail-icon">⏱️</div>
                    <div class="detail-text"><strong>Duration:</strong> ${data.duration}</div>
                </div>
                ${data.organizerName ? `
                <div class="detail-row">
                    <div class="detail-icon">👤</div>
                    <div class="detail-text"><strong>Organizer:</strong> ${data.organizerName}</div>
                </div>
                ` : ''}
            </div>
        </div>
        
        ${data.description ? `
        <div class="description">
            <h3>📝 Meeting Description</h3>
            <p>${data.description}</p>
        </div>
        ` : ''}
        
        ${data.meetingLink ? `
        <div style="text-align: center;">
            <a href="${data.meetingLink}" class="meeting-link">
                🚀 Join Meeting Now
            </a>
        </div>
        ` : ''}
        
        <div class="footer">
            <p><strong>Hello ${data.attendeeName},</strong></p>
            <p>This is a friendly reminder that your meeting "${data.meetingTitle}" is scheduled to start in 30 minutes.</p>
            <p>Please ensure you're ready and have all necessary materials prepared.</p>
            <p style="margin-top: 15px; font-size: 12px; color: #999;">
                This reminder was sent automatically by Sync Essence AI.<br>
                If you have any questions, please contact the meeting organizer.
            </p>
        </div>
    </div>
</body>
</html>
    `;
  }

  /**
   * Send reminder email to attendees
   */
  async sendReminderEmail(
    meetingId: string,
    attendees: Array<{ name: string; email: string }>,
    meetingData: {
      title: string;
      scheduled_at: string;
      duration_mins: number;
      description?: string;
      meeting_link?: string;
    }
  ): Promise<boolean> {
    try {
      const meetingDate = new Date(meetingData.scheduled_at);
      const formattedDate = meetingDate.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
      const formattedTime = meetingDate.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      });
      const duration = `${meetingData.duration_mins} minutes`;

      const reminderData = {
        meetingTitle: meetingData.title,
        meetingDate: formattedDate,
        meetingTime: formattedTime,
        duration: duration,
        meetingLink: meetingData.meeting_link,
        description: meetingData.description
      };

      const htmlBody = ReminderService.generateReminderEmailTemplate(reminderData);

      // Send to backend API
      const response = await fetch(`${this.baseUrl}/send-reminder-emails`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          meeting_id: meetingId,
          attendees: attendees,
          subject: `Meeting Reminder: ${meetingData.title}`,
          html_body: htmlBody,
          meeting_data: reminderData
        }),
      });

      if (!response.ok) {
        throw new Error(`Reminder email sending failed: ${response.statusText}`);
      }

      const result = await response.json();
      console.log('Reminder emails sent:', result);

      // Update reminder status in database
      await this.updateReminderStatus(meetingId, true);

      return result.success;
    } catch (error) {
      console.error('Error sending reminder emails:', error);
      return false;
    }
  }

  /**
   * Schedule reminder for a meeting (30 minutes before)
   */
  async scheduleReminder(meetingId: string, scheduledAt: string): Promise<boolean> {
    try {
      const meetingTime = new Date(scheduledAt);
      const reminderTime = new Date(meetingTime.getTime() - 30 * 60 * 1000); // 30 minutes before
      
      // Only schedule if reminder time is in the future
      if (reminderTime <= new Date()) {
        console.log('Reminder time is in the past, skipping scheduling');
        return false;
      }

      // Store reminder in database (using upsert since meeting_id is primary key)
      const { error } = await supabase
        .from('meeting_reminders')
        .upsert({
          meeting_id: meetingId,
          scheduled_at: reminderTime.toISOString(),
          reminder_sent: false
        }, {
          onConflict: 'meeting_id'
        });

      if (error) {
        console.error('Error scheduling reminder:', error);
        return false;
      }

      console.log(`Reminder scheduled for ${reminderTime.toISOString()}`);
      return true;
    } catch (error) {
      console.error('Error scheduling reminder:', error);
      return false;
    }
  }

  /**
   * Get meetings that need reminders sent
   */
  async getPendingReminders(): Promise<MeetingReminder[]> {
    try {
      const now = new Date().toISOString();
      
      const { data, error } = await supabase
        .from('meeting_reminders')
        .select(`
          *,
          meetings!inner (
            id,
            title,
            scheduled_at,
            duration_mins,
            description,
            meeting_attendees (
              attendees
            )
          )
        `)
        .eq('reminder_sent', false)
        .lte('scheduled_at', now);

      if (error) {
        console.error('Error fetching pending reminders:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error fetching pending reminders:', error);
      return [];
    }
  }

  /**
   * Update reminder status
   */
  async updateReminderStatus(meetingId: string, sent: boolean): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('meeting_reminders')
        .update({
          reminder_sent: sent,
          reminder_sent_at: sent ? new Date().toISOString() : null
        })
        .eq('meeting_id', meetingId);

      if (error) {
        console.error('Error updating reminder status:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error updating reminder status:', error);
      return false;
    }
  }

  /**
   * Process all pending reminders
   */
  async processPendingReminders(): Promise<void> {
    try {
      const pendingReminders = await this.getPendingReminders();
      
      for (const reminder of pendingReminders) {
        const meeting = reminder.meetings;
        if (!meeting) continue;

        // Extract attendees from the meeting data
        const attendeesData = meeting.meeting_attendees?.[0]?.attendees;
        if (!attendeesData || !Array.isArray(attendeesData)) {
          console.log(`No attendees found for meeting ${meeting.id}`);
          continue;
        }

        const attendees = attendeesData.map((attendee: any) => ({
          name: attendee.name || attendee.email,
          email: attendee.email
        }));

        // Send reminder emails
        const success = await this.sendReminderEmail(
          meeting.id,
          attendees,
          {
            title: meeting.title,
            scheduled_at: meeting.scheduled_at,
            duration_mins: meeting.duration_mins,
            description: meeting.description
          }
        );

        if (success) {
          console.log(`Reminder sent successfully for meeting: ${meeting.title}`);
        } else {
          console.error(`Failed to send reminder for meeting: ${meeting.title}`);
        }
      }
    } catch (error) {
      console.error('Error processing pending reminders:', error);
    }
  }
}
