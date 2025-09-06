import { useState } from 'react';
import { ReminderService } from '../services/reminder-service';
import { schedulerService } from '../services/scheduler-service';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';

export function TestReminderComponent() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<string>('');

  const handleTestReminder = async () => {
    setIsProcessing(true);
    setResult('');

    try {
      // Test the reminder service
      const reminderService = new ReminderService();
      
      // Test email template generation
      const testData = {
        meetingTitle: 'Test Meeting',
        meetingDate: 'Monday, January 15, 2024',
        meetingTime: '2:00 PM',
        duration: '60 minutes',
        meetingLink: 'https://meet.google.com/test-meeting',
        attendeeName: 'John Doe',
        description: 'This is a test meeting to verify the reminder functionality.'
      };

      const htmlTemplate = ReminderService.generateReminderEmailTemplate(testData);
      console.log('Generated HTML template:', htmlTemplate);

      // Test manual reminder processing
      await schedulerService.processRemindersNow();
      
      setResult('✅ Reminder test completed successfully! Check console for details.');
    } catch (error) {
      console.error('Reminder test error:', error);
      setResult(`❌ Reminder test failed: ${error}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleStartScheduler = () => {
    schedulerService.start();
    setResult('✅ Scheduler started successfully!');
  };

  const handleStopScheduler = () => {
    schedulerService.stop();
    setResult('⏹️ Scheduler stopped successfully!');
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>🔔 Reminder System Test</CardTitle>
        <CardDescription>
          Test the meeting reminder email functionality and scheduler
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-2">
          <Button 
            onClick={handleTestReminder} 
            disabled={isProcessing}
            variant="default"
          >
            {isProcessing ? 'Testing...' : 'Test Reminder System'}
          </Button>
          
          <Button 
            onClick={handleStartScheduler} 
            variant="outline"
          >
            Start Scheduler
          </Button>
          
          <Button 
            onClick={handleStopScheduler} 
            variant="outline"
          >
            Stop Scheduler
          </Button>
        </div>

        {result && (
          <div className="p-4 bg-gray-50 rounded-lg">
            <p className="text-sm">{result}</p>
          </div>
        )}

        <div className="text-sm text-gray-600">
          <p><strong>Status:</strong> {schedulerService.isSchedulerRunning() ? '🟢 Running' : '🔴 Stopped'}</p>
          <p><strong>Note:</strong> The scheduler checks for pending reminders every minute.</p>
        </div>
      </CardContent>
    </Card>
  );
}
