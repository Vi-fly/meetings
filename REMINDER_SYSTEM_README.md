# Meeting Reminder System

This document describes the meeting reminder system that automatically sends reminder emails to meeting attendees 30 minutes before their scheduled meetings.

## Features

- **Automatic Scheduling**: Reminders are automatically scheduled when meetings are created
- **30-Minute Advance Notice**: Reminders are sent exactly 30 minutes before meeting start time
- **Beautiful Email Templates**: Professional, responsive HTML email templates
- **Personalized Content**: Each attendee receives a personalized reminder with their name
- **Background Processing**: Scheduler runs in the background to check for pending reminders
- **Database Tracking**: All reminder statuses are tracked in the database

## Architecture

### Components

1. **ReminderService** (`src/services/reminder-service.ts`)
   - Handles reminder email generation and sending
   - Manages reminder scheduling and status tracking
   - Processes pending reminders

2. **SchedulerService** (`src/services/scheduler-service.ts`)
   - Manages the background scheduler
   - Checks for pending reminders every minute
   - Provides manual trigger capabilities

3. **Backend API** (`backend/api-server.py`)
   - `/send-reminder-emails` endpoint for sending reminder emails
   - Handles email personalization and delivery

4. **Database Schema** (Updated with `meeting_id` as primary key)
   - `meeting_reminders` table for tracking reminder status
   - Proper indexing and RLS policies

## Database Schema

### meeting_reminders Table

```sql
CREATE TABLE meeting_reminders (
    meeting_id UUID NOT NULL REFERENCES meetings(id) ON DELETE CASCADE PRIMARY KEY,
    scheduled_at TIMESTAMPTZ NOT NULL,
    reminder_sent BOOLEAN DEFAULT FALSE,
    reminder_sent_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

## Email Template

The reminder email template includes:

- **Professional Design**: Modern, responsive HTML layout
- **Meeting Details**: Title, date, time, duration, organizer
- **Meeting Link**: Direct link to join the meeting (if provided)
- **Description**: Meeting description and agenda
- **Personalization**: Attendee's name in greeting
- **Visual Elements**: Icons, gradients, and professional styling

## Usage

### Automatic Scheduling

When a meeting is created through the `useCreateMeeting` hook, a reminder is automatically scheduled:

```typescript
// In use-meetings.ts
await schedulerService.scheduleMeetingReminder(meetingData.id, meeting.scheduled_at);
```

### Manual Testing

Use the test component in the Dashboard's "Test" tab to:

- Test the reminder email template generation
- Manually trigger reminder processing
- Start/stop the scheduler
- View scheduler status

### Backend Integration

The system integrates with the existing email infrastructure:

```python
# In api-server.py
@app.route('/send-reminder-emails', methods=['POST'])
def send_reminder_emails_endpoint():
    # Sends personalized reminder emails to all attendees
```

## Configuration

### Environment Variables

Ensure these are set in your backend:

```env
EMAIL_SENDER=your-email@domain.com
EMAIL_PASSWORD=your-app-password
EMAIL_SMTP_SERVER=smtp.gmail.com
EMAIL_SMTP_PORT=587
```

### Scheduler Settings

The scheduler checks for pending reminders every minute. This can be adjusted in `SchedulerService`:

```typescript
// Check every minute (60000ms)
this.intervalId = setInterval(async () => {
    await this.reminderService.processPendingReminders();
}, 60000);
```

## Testing

### Manual Testing

1. Go to Dashboard → Test tab
2. Click "Test Reminder System" to test email template generation
3. Click "Start Scheduler" to begin background processing
4. Create a test meeting with a future date/time
5. Verify the reminder is scheduled in the database

### Database Testing

Check the `meeting_reminders` table:

```sql
SELECT * FROM meeting_reminders 
WHERE reminder_sent = false 
ORDER BY scheduled_at;
```

### Email Testing

The system will send actual emails if SMTP is configured. For development, emails are logged to the console.

## Troubleshooting

### Common Issues

1. **Reminders not being sent**
   - Check if scheduler is running: `schedulerService.isSchedulerRunning()`
   - Verify SMTP configuration in backend
   - Check database for pending reminders

2. **Database errors**
   - Ensure the `meeting_reminders` table exists with proper schema
   - Check RLS policies are properly configured
   - Verify user has proper permissions

3. **Email delivery issues**
   - Check SMTP credentials and server settings
   - Verify email addresses are valid
   - Check spam folders

### Debug Mode

Enable debug logging by checking the browser console and backend logs for detailed information about reminder processing.

## Security

- **Row Level Security**: RLS policies ensure users can only access reminders for their organization's meetings
- **Email Validation**: Email addresses are validated before sending
- **Rate Limiting**: Consider implementing rate limiting for email sending in production

## Performance

- **Efficient Queries**: Database queries use proper indexing
- **Background Processing**: Reminder processing doesn't block the UI
- **Batch Processing**: Multiple reminders can be processed efficiently

## Future Enhancements

- **Multiple Reminder Times**: Support for 1 hour, 1 day, etc. reminders
- **Custom Templates**: Allow users to customize email templates
- **SMS Reminders**: Add SMS notification support
- **Calendar Integration**: Sync with Google Calendar, Outlook, etc.
- **Reminder Preferences**: Let users set their preferred reminder times

## API Reference

### ReminderService Methods

- `scheduleReminder(meetingId, scheduledAt)`: Schedule a reminder
- `sendReminderEmail(meetingId, attendees, meetingData)`: Send reminder emails
- `getPendingReminders()`: Get reminders ready to be sent
- `updateReminderStatus(meetingId, sent)`: Update reminder status

### SchedulerService Methods

- `start()`: Start the background scheduler
- `stop()`: Stop the background scheduler
- `processRemindersNow()`: Manually process pending reminders
- `isSchedulerRunning()`: Check scheduler status

## Support

For issues or questions about the reminder system, check:

1. Browser console for client-side errors
2. Backend logs for server-side errors
3. Database logs for query issues
4. Email server logs for delivery problems
