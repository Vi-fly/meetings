import { ReminderService } from './reminder-service';

export class SchedulerService {
  private reminderService: ReminderService;
  private intervalId: NodeJS.Timeout | null = null;
  private isRunning: boolean = false;

  constructor() {
    this.reminderService = new ReminderService();
  }

  /**
   * Start the scheduler to check for pending reminders
   */
  start(): void {
    if (this.isRunning) {
      console.log('Scheduler is already running');
      return;
    }

    console.log('Starting reminder scheduler...');
    this.isRunning = true;

    // Check for pending reminders every minute
    this.intervalId = setInterval(async () => {
      try {
        await this.reminderService.processPendingReminders();
      } catch (error) {
        console.error('Error processing pending reminders:', error);
      }
    }, 60000); // Check every minute

    console.log('Reminder scheduler started successfully');
  }

  /**
   * Stop the scheduler
   */
  stop(): void {
    if (!this.isRunning) {
      console.log('Scheduler is not running');
      return;
    }

    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }

    this.isRunning = false;
    console.log('Reminder scheduler stopped');
  }

  /**
   * Check if scheduler is running
   */
  isSchedulerRunning(): boolean {
    return this.isRunning;
  }

  /**
   * Manually trigger reminder processing (for testing)
   */
  async processRemindersNow(): Promise<void> {
    try {
      console.log('Manually processing reminders...');
      await this.reminderService.processPendingReminders();
      console.log('Manual reminder processing completed');
    } catch (error) {
      console.error('Error in manual reminder processing:', error);
    }
  }

  /**
   * Schedule a reminder for a specific meeting
   */
  async scheduleMeetingReminder(meetingId: string, scheduledAt: string): Promise<boolean> {
    try {
      console.log(`Scheduling reminder for meeting ${meetingId} at ${scheduledAt}`);
      return await this.reminderService.scheduleReminder(meetingId, scheduledAt);
    } catch (error) {
      console.error('Error scheduling meeting reminder:', error);
      return false;
    }
  }
}

// Create a singleton instance
export const schedulerService = new SchedulerService();
