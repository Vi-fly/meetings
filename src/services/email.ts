import { config } from './config';

export interface EmailOptions {
  to: string;
  subject: string;
  body?: string;
  htmlBody?: string;
  pdfBuffer?: ArrayBuffer;
  pdfFilename?: string;
}

export class EmailService {
  /**
   * Send email with optional PDF attachment
   * Note: This is a client-side implementation that would need a backend proxy
   * for actual SMTP functionality due to CORS restrictions
   */
  static async sendEmail(options: EmailOptions): Promise<boolean> {
    try {
      // For now, we'll create a structured email object that can be sent to a backend
      const emailData = {
        from: config.EMAIL_SENDER,
        to: options.to,
        subject: options.subject,
        body: options.body || '',
        htmlBody: options.htmlBody || '',
        pdfBuffer: options.pdfBuffer ? Array.from(new Uint8Array(options.pdfBuffer)) : null,
        pdfFilename: options.pdfFilename || 'Minutes_of_Meeting.pdf',
      };

      // This would typically be sent to your backend API
      // For now, we'll just log it and return success
      console.log('Email data prepared:', {
        to: emailData.to,
        subject: emailData.subject,
        hasPdf: !!emailData.pdfBuffer,
        htmlBody: emailData.htmlBody ? 'HTML email template generated' : 'No HTML body',
      });

      // Simulate email sending delay
      await new Promise(resolve => setTimeout(resolve, 1000));

      // TODO: Implement actual email sending through backend API
      // const response = await fetch('/api/send-email', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify(emailData),
      // });

      return true;
    } catch (error) {
      console.error('Failed to send email:', error);
      return false;
    }
  }

  /**
   * Generate HTML email template for meeting minutes
   */
  static generateEmailTemplate(data: {
    meetingTopic: string;
    meetingDate: string;
    meetingTime: string;
    duration: string;
    speakerName: string;
    summary: string;
    momText: string;
    meetingLink?: string;
  }): string {
    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Meeting Minutes</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { 
            background: linear-gradient(135deg, #1e40af 0%, #3b82f6 50%, #60a5fa 100%);
            color: white;
            padding: 80px 60px;
            border-radius: 20px 20px 0 0;
            margin-bottom: 20px;
            display: flex;
            align-items: center;
            justify-content: space-between;
            position: relative;
            overflow: hidden;
            box-shadow: 0 10px 30px rgba(30, 64, 175, 0.3);
        }
        .header::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><defs><pattern id="grain" width="100" height="100" patternUnits="userSpaceOnUse"><circle cx="25" cy="25" r="1" fill="white" opacity="0.1"/><circle cx="75" cy="75" r="1" fill="white" opacity="0.1"/><circle cx="50" cy="10" r="0.5" fill="white" opacity="0.1"/></pattern></defs><rect width="100" height="100" fill="url(%23grain)"/></svg>');
            opacity: 0.2;
        }
        .header-logo {
            position: relative;
            z-index: 2;
            width: 180px;
            height: 180px;
            display: flex;
            align-items: center;
            justify-content: center;
            background: transparent;
            border-radius: 0;
            backdrop-filter: none;
            border: none;
            box-shadow: none;
            transition: all 0.3s ease;
            margin: 0 20px;
        }
        .header-logo img {
            max-width: 100%;
            max-height: 100%;
            object-fit: contain;
            filter: none;
            opacity: 1;
            border-radius: 0;
            pointer-events: none;
            user-select: none;
            -webkit-user-drag: none;
            -khtml-user-drag: none;
            -moz-user-drag: none;
            -o-user-drag: none;
            user-drag: none;
        }
        .header-content {
            position: relative;
            z-index: 1;
            flex: 1;
            text-align: center;
        }
        .content { background-color: #ffffff; padding: 20px; border-radius: 8px; }
        .footer { margin-top: 20px; padding: 20px; background-color: #f8f9fa; border-radius: 8px; font-size: 14px; color: #666; }
        h1 { 
            color: white; 
            margin-bottom: 10px; 
            font-size: 38px;
            font-weight: 800;
            letter-spacing: -1px;
            text-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
            background: linear-gradient(135deg, #ffffff 0%, #f0f8ff 100%);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
        }
        h2 { color: #34495e; margin-top: 20px; margin-bottom: 10px; }
        .meeting-details { margin: 15px 0; color: white; }
        .meeting-details strong { color: white; }
        .summary { background-color: #e8f4fd; padding: 15px; border-radius: 5px; margin: 15px 0; }
        @media (max-width: 600px) {
            .header {
                flex-direction: column;
                gap: 25px;
                padding: 60px 25px;
            }
            .header-logo {
                width: 140px;
                height: 140px;
            }
            h1 {
                font-size: 32px;
            }
            .meeting-details {
                font-size: 14px;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="header-logo">
                <img src="https://ryftlmknvgxodnxkilzg.supabase.co/storage/v1/object/public/logo/logo.png" alt="Logo 1">
            </div>
            <div class="header-content">
                <h1>📋 Meeting Minutes</h1>
                <div class="meeting-details">
                    <strong>Topic:</strong> ${data.meetingTopic}<br>
                    <strong>Date:</strong> ${data.meetingDate}<br>
                    <strong>Time:</strong> ${data.meetingTime}<br>
                    <strong>Duration:</strong> ${data.duration}<br>
                    <strong>Speaker:</strong> ${data.speakerName}
                </div>
            </div>
            <div class="header-logo">
                <img src="https://ryftlmknvgxodnxkilzg.supabase.co/storage/v1/object/public/logo/logo1.png" alt="Logo 2">
            </div>
        </div>
        
        <div class="content">
            <h2>📝 Summary</h2>
            <div class="summary">
                ${data.summary}
            </div>
            
            <h2>📄 Detailed Minutes</h2>
            <div style="white-space: pre-wrap;">${data.momText}</div>
            
            ${data.meetingLink ? `
            <div style="margin-top: 20px; padding: 15px; background-color: #f0f8ff; border-radius: 5px;">
                <strong>Meeting Link:</strong> <a href="${data.meetingLink}" target="_blank">${data.meetingLink}</a>
            </div>
            ` : ''}
        </div>
        
        <div class="footer">
            <p>This email was automatically generated by Sync Essence AI.</p>
            <p>Please find the detailed minutes attached as a PDF document.</p>
        </div>
    </div>
</body>
</html>
    `;
  }
}
