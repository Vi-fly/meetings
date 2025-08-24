from threading import Lock
import uuid
from flask import Flask, request, jsonify, send_file
from flask_cors import CORS
import os
import json
import time
import io
from datetime import datetime, timedelta
from werkzeug.utils import secure_filename
import assemblyai as aai
# Google AI import removed for now - focusing on email functionality
from reportlab.lib.pagesizes import letter
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, ListFlowable
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_LEFT
from reportlab.lib import colors
from reportlab.pdfgen import canvas
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from email.mime.application import MIMEApplication
import copy
from dotenv import load_dotenv
from googleapiclient.discovery import build
from googleapiclient.http import MediaFileUpload, MediaIoBaseDownload
from google_auth_oauthlib.flow import InstalledAppFlow
from google.oauth2.credentials import Credentials
from google.auth.transport.requests import Request
import logging
from threading import Thread
import requests

# Configure logging
logging.basicConfig(
    level=logging.DEBUG,
    format="%(asctime)s [%(levelname)s] %(message)s"
)
logger = logging.getLogger("gdrive_upload")

# Load environment variables
load_dotenv('env.config')
GDRIVE_CLIENT_ID = os.getenv('GDRIVE_CLIENT_ID')
GDRIVE_CLIENT_SECRET = os.getenv('GDRIVE_CLIENT_SECRET')
GDRIVE_REDIRECT_URI = os.getenv('GDRIVE_REDIRECT_URI')
TOKEN_PATH = './token.json'
SCOPES = ['https://www.googleapis.com/auth/drive.file']
CREDENTIALS_PATH = './oauth.json'

# Supabase configuration
SUPABASE_URL = "https://ryftlmknvgxodnxkilzg.supabase.co"
SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ5ZnRsbWtudmd4b2RueGtpbHpnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQxMjY5MTAsImV4cCI6MjA2OTcwMjkxMH0.2iUReWBMETzYYg7W1O5vChy6UKv0_zMq0f7Lq3ydUus"
SUPABASE_SERVICE_ROLE_KEY = os.getenv('SUPABASE_SERVICE_ROLE_KEY')  # Add this to your env.config file

def save_file_to_supabase(meeting_id, drive_file_id, original_filename, uploaded_by=None):
    """
    Save file information to Supabase meeting_videos table
    """
    try:
        # Create the share link for the Google Drive file
        drive_share_link = f"https://drive.google.com/file/d/{drive_file_id}/view"
        
        # Prepare the data for Supabase
        data = {
            "meeting_id": meeting_id,
            "drive_share_link": drive_share_link,
            "original_filename": original_filename,
            "uploaded_at": datetime.now().isoformat(),
        }
        
        # Only add uploaded_by if it's provided
        if uploaded_by:
            data["uploaded_by"] = uploaded_by
        
        logger.debug(f"Preparing to save data to Supabase: {data}")
        
        # Use anon key for now (you should use service role key in production)
        # If SUPABASE_SERVICE_ROLE_KEY is not set, fall back to anon key
        api_key = SUPABASE_SERVICE_ROLE_KEY if SUPABASE_SERVICE_ROLE_KEY else SUPABASE_ANON_KEY
        
        if not api_key:
            logger.error("No Supabase API key available")
            return False
        
        headers = {
            "apikey": api_key,
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
            "Prefer": "return=minimal"
        }
        
        logger.debug(f"Making request to Supabase with headers: {dict(headers)}")
        
        # Upsert into meeting_videos table (handle one-to-one relationship)
        headers["Prefer"] = "resolution=merge-duplicates"
        response = requests.post(
            f"{SUPABASE_URL}/rest/v1/meeting_videos",
            headers=headers,
            json=data
        )
        
        logger.debug(f"Supabase response: {response.status_code} - {response.text}")
        
        if response.status_code in [200, 201]:
            logger.info(f"Successfully saved file info to Supabase for meeting {meeting_id}")
            return True
        else:
            logger.error(f"Failed to save to Supabase: {response.status_code} - {response.text}")
            return False
            
    except Exception as e:
        logger.error(f"Error saving file info to Supabase: {e}")
        return False

def get_file_from_supabase(meeting_id):
    """
    Retrieve file information from Supabase for a given meeting
    """
    try:
        headers = {
            "apikey": SUPABASE_ANON_KEY,
            "Authorization": f"Bearer {SUPABASE_ANON_KEY}"
        }
        
        response = requests.get(
            f"{SUPABASE_URL}/rest/v1/meeting_videos?meeting_id=eq.{meeting_id}",
            headers=headers
        )
        
        if response.status_code == 200:
            return response.json()
        else:
            logger.error(f"Failed to retrieve from Supabase: {response.status_code}")
            return None
            
    except Exception as e:
        logger.error(f"Error retrieving file info from Supabase: {e}")
        return None


def start_auto_processing(meeting_id, drive_file_id, filename):
    """
    Start automatic transcription and MoM generation after file upload
    """
    def auto_process_worker():
        try:
            logger.info(f"Starting automatic processing for meeting {meeting_id}")
            
            # Step 1: Download file from Google Drive for transcription
            logger.info(f"Downloading file from Google Drive for transcription...")
            local_file_path = download_from_drive(drive_file_id, filename)
            
            if not local_file_path:
                logger.error(f"Failed to download file from Google Drive for meeting {meeting_id}")
                return
            
            try:
                # Step 2: Generate transcript
                logger.info(f"Generating transcript for meeting {meeting_id}")
                transcript_result = transcribe_audio(local_file_path)
                
                if not transcript_result:
                    logger.error(f"Failed to generate transcript for meeting {meeting_id}")
                    return
                
                # Step 3: Save transcript to Supabase
                logger.info(f"Saving transcript to Supabase for meeting {meeting_id}")
                save_transcript_to_supabase(meeting_id, transcript_result)
                
                # Step 4: Generate MoM from transcript
                logger.info(f"Generating MoM for meeting {meeting_id}")
                mom_result = generate_minutes_of_meeting(transcript_result.get('text', ''))
                
                if mom_result:
                    # Step 5: Save MoM to Supabase
                    logger.info(f"Saving MoM to Supabase for meeting {meeting_id}")
                    save_mom_to_supabase(meeting_id, mom_result, transcript_result.get('text', ''))
                    
                    logger.info(f"✅ Automatic processing completed for meeting {meeting_id}")
                else:
                    logger.error(f"Failed to generate MoM for meeting {meeting_id}")
                    
            finally:
                # Clean up downloaded file
                try:
                    os.remove(local_file_path)
                    logger.debug(f"Cleaned up local file: {local_file_path}")
                except Exception as e:
                    logger.warning(f"Failed to clean up local file: {e}")
                    
        except Exception as e:
            logger.error(f"Error in automatic processing for meeting {meeting_id}: {e}")
    
    # Start processing in background thread
    thread = Thread(target=auto_process_worker)
    thread.daemon = True
    thread.start()
    logger.info(f"Started automatic processing thread for meeting {meeting_id}")


def download_from_drive(drive_file_id, filename):
    """
    Download file from Google Drive for processing
    """
    try:
        creds = get_authenticated_client()
        drive_service = build('drive', 'v3', credentials=creds)
        
        # Create local file path
        local_path = os.path.join(UPLOAD_FOLDER, f"temp_{filename}")
        
        # Download file
        request = drive_service.files().get_media(fileId=drive_file_id)
        with open(local_path, 'wb') as f:
            downloader = MediaIoBaseDownload(f, request)
            done = False
            while done is False:
                status, done = downloader.next_chunk()
                logger.debug(f"Download progress: {int(status.progress() * 100)}%")
        
        logger.info(f"Successfully downloaded file to {local_path}")
        return local_path
        
    except Exception as e:
        logger.error(f"Error downloading file from Google Drive: {e}")
        return None


def save_transcript_to_supabase(meeting_id, transcript_result):
    """
    Save transcript to Supabase meeting_minutes table
    """
    try:
        data = {
            "meeting_id": meeting_id,
            "transcript": transcript_result.get('text', ''),
            "created_at": datetime.now().isoformat()
        }
        
        api_key = SUPABASE_SERVICE_ROLE_KEY if SUPABASE_SERVICE_ROLE_KEY else SUPABASE_ANON_KEY
        
        headers = {
            "apikey": api_key,
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
            "Prefer": "resolution=merge-duplicates"
        }
        
        response = requests.post(
            f"{SUPABASE_URL}/rest/v1/meeting_minutes",
            headers=headers,
            json=data
        )
        
        if response.status_code in [200, 201]:
            logger.info(f"Successfully saved transcript to Supabase for meeting {meeting_id}")
            return True
        else:
            logger.error(f"Failed to save transcript to Supabase: {response.status_code} - {response.text}")
            return False
            
    except Exception as e:
        logger.error(f"Error saving transcript to Supabase: {e}")
        return False


def save_mom_to_supabase(meeting_id, mom_result, transcript_text):
    """
    Save Minutes of Meeting to Supabase meeting_minutes table
    """
    try:
        # Convert MoM to JSON string
        mom_json = json.dumps(mom_result)
        
        data = {
            "meeting_id": meeting_id,
            "full_mom": mom_json,
            "summary": mom_result.get('summary', ''),
            "transcript": transcript_text,
            "updated_at": datetime.now().isoformat()
        }
        
        api_key = SUPABASE_SERVICE_ROLE_KEY if SUPABASE_SERVICE_ROLE_KEY else SUPABASE_ANON_KEY
        
        headers = {
            "apikey": api_key,
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
            "Prefer": "resolution=merge-duplicates"
        }
        
        response = requests.patch(
            f"{SUPABASE_URL}/rest/v1/meeting_minutes?meeting_id=eq.{meeting_id}",
            headers=headers,
            json=data
        )
        
        if response.status_code in [200, 201, 204]:
            logger.info(f"Successfully saved MoM to Supabase for meeting {meeting_id}")
            return True
        else:
            logger.error(f"Failed to save MoM to Supabase: {response.status_code} - {response.text}")
            return False
            
    except Exception as e:
        logger.error(f"Error saving MoM to Supabase: {e}")
        return False


def get_authenticated_client():
    creds = None
    if os.path.exists(TOKEN_PATH):
        creds = Credentials.from_authorized_user_file(TOKEN_PATH, SCOPES)
    if not creds or not creds.valid:
        if creds and creds.expired and creds.refresh_token:
            creds.refresh(Request())
            try:
                creds.refresh(Request())
            except Exception as e:
                print(
                    f"Token refresh failed: {e}. A new authorization is required.")
                
                
                flow = InstalledAppFlow.from_client_config(
                    {
                        "installed": {
                            "client_id": GDRIVE_CLIENT_ID,
                            "client_secret": GDRIVE_CLIENT_SECRET,
                            "redirect_uris": [GDRIVE_REDIRECT_URI],
                            "auth_uri": "https://accounts.google.com/o/oauth2/auth",
                            "token_uri": "https://oauth2.googleapis.com/token"
                        }
                    },
                    SCOPES
                )

                creds = flow.run_local_server(port=9000)
        else:

            flow = InstalledAppFlow.from_client_config(
                {
                    "installed": {
                        "client_id": GDRIVE_CLIENT_ID,
                        "client_secret": GDRIVE_CLIENT_SECRET,
                        "redirect_uris": [GDRIVE_REDIRECT_URI],
                        "auth_uri": "https://accounts.google.com/o/oauth2/auth",
                        "token_uri": "https://oauth2.googleapis.com/token"
                    }
                },
                SCOPES
            )

            creds = flow.run_local_server(port=9000, access_type='offline',
                                          prompt='consent')
            logger.info(f"cred: {creds.refresh_token}")
        with open(TOKEN_PATH, 'w') as token:
            token.write(creds.to_json())
    return creds


def upload_drive_file(local_path, filename, mime_type):
    creds = get_authenticated_client()
    drive_service = build('drive', 'v3', credentials=creds)
    file_metadata = {
        'name': filename,
        'parents': ['1UtJ9pckF4viXsGhJ8dwt0oU91OPPxyVa'],
    }
    media = MediaFileUpload(local_path, mimetype=mime_type, resumable=True)
    file = drive_service.files().create(
        body=file_metadata,
        media_body=media,
        fields='id'
    ).execute()
    return file.get('id')


def delete_drive_file(file_id):
    creds = get_authenticated_client()
    drive_service = build('drive', 'v3', credentials=creds)
    try:
        drive_service.files().delete(fileId=file_id).execute()
        return True
    except Exception as e:
        print(f"Error deleting file: {e}")
        return False


app = Flask(__name__)
CORS(app)

# Configuration
UPLOAD_FOLDER = 'uploads'
ALLOWED_EXTENSIONS = {'mp3', 'wav', 'm4a', 'mp4', 'avi', 'mov', 'mkv'}

# API Keys (set these in environment variables)
ASSEMBLYAI_API_KEY = os.getenv('ASSEMBLYAI_API_KEY', 'your_assemblyai_key')
GEMINI_API_KEY = os.getenv('GEMINI_API_KEY', 'your_gemini_key')
EMAIL_SENDER = os.getenv('EMAIL_SENDER', 'your_email@gmail.com')
EMAIL_PASSWORD = os.getenv('EMAIL_PASSWORD', 'your_app_password')
EMAIL_SMTP_SERVER = os.getenv('EMAIL_SMTP_SERVER', 'smtp.gmail.com')
EMAIL_SMTP_PORT = int(os.getenv('EMAIL_SMTP_PORT', '587'))

# Initialize APIs
aai.settings.api_key = ASSEMBLYAI_API_KEY
# Note: For simplicity, we'll use a different approach for Gemini AI
# You'll need to set up proper authentication for production use

if not os.path.exists(UPLOAD_FOLDER):
    os.makedirs(UPLOAD_FOLDER)


@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({
        'status': 'healthy',
        'timestamp': datetime.now().isoformat(),
        'service': 'Sync Essence API',
        'version': '1.0.0'
    })


@app.route('/test-transcribe', methods=['GET'])
def test_transcribe():
    """Test endpoint for transcribe functionality"""
    return jsonify({
        'status': 'transcribe_endpoint_available',
        'message': 'Transcribe endpoint is ready to accept file uploads',
        'supported_formats': list(ALLOWED_EXTENSIONS),
        'timestamp': datetime.now().isoformat()
    })


def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS


def transcribe_audio(local_file_path: str):
    """Transcribe audio file using AssemblyAI with speaker diarization"""
    try:
        config_ = aai.TranscriptionConfig(
            speaker_labels=True, speakers_expected=2)
        transcriber = aai.Transcriber()
        transcript = transcriber.transcribe(local_file_path, config=config_)

        transcript_json = {
            "text": transcript.text,
            "segments": []
        }

        if hasattr(transcript, 'utterances') and transcript.utterances:
            for utt in transcript.utterances:
                transcript_json["segments"].append({
                    "speaker": utt.speaker,
                    "start": getattr(utt, "start", 0),
                    "text": utt.text
                })
        elif hasattr(transcript, "segments") and transcript.segments:
            for seg in transcript.segments:
                transcript_json["segments"].append({
                    "speaker": seg.speaker,
                    "start": getattr(seg, "start", 0),
                    "text": seg.text
                })

        return transcript_json
    except Exception as e:
        print(f"[Transcription] Failed: {e}")
        return None


def generate_summary(transcript: str, prompt: str) -> str:
    """Generate summary using a simple approach"""
    try:
        # For now, return a simple summary
        # In production, you would integrate with Gemini AI or another service
        words = transcript.split()
        if len(words) > 100:
            summary = " ".join(words[:100]) + "..."
        else:
            summary = transcript
        return f"Summary: {summary}"
    except Exception as e:
        print(f"[NLP] Summary generation failed: {e}")
        return None


def generate_minutes_of_meeting(transcript: str) -> dict:
    """Generate simple minutes of meeting from transcript"""
    try:
        # For now, create a simple MoM structure
        # In production, you would use AI to generate this
        mom_data = {
            "title": "Generated Meeting",
            "date": datetime.now().strftime("%Y-%m-%d"),
            "time": datetime.now().strftime("%H:%M"),
            "attendees": ["Speaker 1", "Speaker 2"],
            "agenda": ["Discussion", "Action Items"],
            "discussions": [
                {
                    "title": "Main Discussion",
                    "points": [transcript[:200] + "..." if len(transcript) > 200 else transcript]
                }
            ],
            "actions": ["Follow up on discussed items"],
            "conclusion": "Meeting completed successfully",
            "summary": transcript[:100] + "..." if len(transcript) > 100 else transcript
        }
        return mom_data
    except Exception as e:
        print(f"[NLP] Failed to generate MoM: {e}")
        return None


def create_meeting_invitation_html(invitation_data):
    """Create beautiful and professional HTML email template for meeting invitations"""
    attendees_list = ""
    for attendee in invitation_data.get('attendees', []):
        name = attendee.get('name', attendee.get('email', ''))
        attendees_list += f"<li style='margin-bottom: 8px;'>{name} ({attendee.get('email', '')})</li>"

    agenda_list = ""
    for item in invitation_data.get('agenda', []):
        agenda_list += f"<li style='margin-bottom: 6px;'>{item}</li>"

    meeting_link_html = ""
    if invitation_data.get('meetingLink'):
        meeting_link_html = f"""
        <div style="background: #f8f9fa; padding: 15px; border-radius: 8px; margin: 15px 0; border-left: 4px solid #007bff;">
            <p style="margin: 0; font-weight: 600; color: #495057;">🔗 Meeting Link:</p>
            <a href="{invitation_data['meetingLink']}" style="color: #007bff; text-decoration: none; word-break: break-all;">{invitation_data['meetingLink']}</a>
        </div>
        """

    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Meeting Invitation</title>
        <style>
            @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');
            
            body {{
                font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                line-height: 1.6;
                color: #1a1a1a;
                background-color: #f5f5f5;
                margin: 0;
                padding: 0;
            }}
            
            .email-container {{
                max-width: 600px;
                margin: 0 auto;
                background-color: #ffffff;
                box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
            }}
            
            .header {{
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
                padding: 40px 30px;
                text-align: center;
                position: relative;
                overflow: hidden;
            }}
            
            .header::before {{
                content: '';
                position: absolute;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><defs><pattern id="grain" width="100" height="100" patternUnits="userSpaceOnUse"><circle cx="25" cy="25" r="1" fill="white" opacity="0.1"/><circle cx="75" cy="75" r="1" fill="white" opacity="0.1"/><circle cx="50" cy="10" r="0.5" fill="white" opacity="0.1"/></pattern></defs><rect width="100" height="100" fill="url(%23grain)"/></svg>');
                opacity: 0.3;
            }}
            
            .header-content {{
                position: relative;
                z-index: 1;
            }}
            
            .header h1 {{
                margin: 0;
                font-size: 32px;
                font-weight: 700;
                letter-spacing: -0.5px;
                margin-bottom: 8px;
            }}
            
            .header p {{
                margin: 0;
                font-size: 18px;
                font-weight: 400;
                opacity: 0.95;
            }}
            
            .content {{
                padding: 40px 30px;
                background-color: #ffffff;
            }}
            
            .meeting-title {{
                font-size: 24px;
                font-weight: 600;
                color: #1a1a1a;
                margin-bottom: 30px;
                text-align: center;
                padding-bottom: 20px;
                border-bottom: 2px solid #f0f0f0;
            }}
            
            .info-section {{
                background: #f8f9fa;
                border-radius: 12px;
                padding: 25px;
                margin-bottom: 25px;
                border-left: 4px solid #667eea;
                box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
            }}
            
            .info-section h3 {{
                margin: 0 0 15px 0;
                color: #667eea;
                font-size: 18px;
                font-weight: 600;
                display: flex;
                align-items: center;
                gap: 8px;
            }}
            
            .info-grid {{
                display: grid;
                grid-template-columns: 1fr 1fr;
                gap: 15px;
                margin-bottom: 15px;
            }}
            
            .info-item {{
                display: flex;
                align-items: center;
                gap: 10px;
                padding: 12px;
                background: white;
                border-radius: 8px;
                border: 1px solid #e9ecef;
            }}
            
            .info-item strong {{
                color: #495057;
                font-weight: 600;
                min-width: 80px;
            }}
            
            .info-item span {{
                color: #1a1a1a;
                font-weight: 500;
            }}
            
            .description-box {{
                background: #e3f2fd;
                border-radius: 8px;
                padding: 20px;
                margin: 20px 0;
                border-left: 4px solid #2196f3;
            }}
            
            .description-box p {{
                margin: 0;
                color: #1565c0;
                font-weight: 500;
                line-height: 1.6;
            }}
            
            .agenda-list {{
                list-style: none;
                padding: 0;
                margin: 0;
            }}
            
            .agenda-list li {{
                padding: 10px 15px;
                margin-bottom: 8px;
                background: white;
                border-radius: 6px;
                border-left: 3px solid #667eea;
                box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
            }}
            
            .attendees-list {{
                list-style: none;
                padding: 0;
                margin: 0;
            }}
            
            .attendees-list li {{
                padding: 8px 12px;
                margin-bottom: 6px;
                background: white;
                border-radius: 6px;
                border: 1px solid #e9ecef;
                font-size: 14px;
            }}
            
            .join-button {{
                display: inline-block;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
                padding: 16px 32px;
                text-decoration: none;
                border-radius: 8px;
                font-weight: 600;
                font-size: 16px;
                text-align: center;
                box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
                transition: all 0.3s ease;
                margin: 20px 0;
            }}
            
            .join-button:hover {{
                transform: translateY(-2px);
                box-shadow: 0 6px 20px rgba(102, 126, 234, 0.6);
            }}
            
            .reminders-box {{
                background: #fff3cd;
                border: 1px solid #ffeaa7;
                border-radius: 8px;
                padding: 20px;
                margin: 25px 0;
            }}
            
            .reminders-box h3 {{
                margin: 0 0 15px 0;
                color: #856404;
                font-size: 16px;
                font-weight: 600;
            }}
            
            .reminders-box ul {{
                margin: 0;
                padding-left: 20px;
            }}
            
            .reminders-box li {{
                margin-bottom: 8px;
                color: #856404;
                font-size: 14px;
            }}
            
            .footer {{
                background: #f8f9fa;
                padding: 30px;
                text-align: center;
                border-top: 1px solid #e9ecef;
            }}
            
            .footer p {{
                margin: 5px 0;
                color: #6c757d;
                font-size: 14px;
            }}
            
            .footer-logo {{
                font-size: 18px;
                font-weight: 700;
                color: #667eea;
                margin-bottom: 10px;
            }}
            
            @media (max-width: 600px) {{
                .email-container {{
                    margin: 0;
                    box-shadow: none;
                }}
                
                .header {{
                    padding: 30px 20px;
                }}
                
                .content {{
                    padding: 30px 20px;
                }}
                
                .info-grid {{
                    grid-template-columns: 1fr;
                }}
                
                .header h1 {{
                    font-size: 28px;
                }}
            }}
        </style>
    </head>
    <body>
        <div class="email-container">
        <div class="header">
                <div class="header-content">
                    <h1>Meeting Invitation</h1>
                    <p>You're invited to join us</p>
                </div>
        </div>
        
        <div class="content">
                <div class="meeting-title">
                    {invitation_data.get('title', 'Meeting')}
                </div>
                
                <div class="info-section">
                    <h3>📋 Meeting Details</h3>
                    <div class="info-grid">
                        <div class="info-item">
                            <strong>📅 Date:</strong>
                            <span>{invitation_data.get('date', 'TBD')}</span>
                        </div>
                        <div class="info-item">
                            <strong>⏰ Time:</strong>
                            <span>{invitation_data.get('time', 'TBD')}</span>
                        </div>
                        <div class="info-item">
                            <strong>📍 Venue:</strong>
                            <span>{invitation_data.get('venue', 'TBD')}</span>
                        </div>
                    </div>
                {meeting_link_html}
            </div>
            
            {f'''
                <div class="description-box">
                <p>{invitation_data.get('description', 'No description provided.')}</p>
            </div>
            ''' if invitation_data.get('description') else ''}
            
                <div class="info-section">
                    <h3>👥 Attendees</h3>
                    <ul class="attendees-list" style="font-size: 14px;">
                    {attendees_list}
                </ul>
            </div>
            
            {f'''
                <div style="text-align: center;">
                    <a href="{invitation_data['meetingLink']}" class="join-button" style="color: white;">🔗 Join Meeting</a>
            </div>
            ''' if invitation_data.get('meetingLink') else ''}
            
                <div class="reminders-box">
                    <h3>💡 Important Reminders</h3>
                <ul>
                    <li>Please arrive 5 minutes before the scheduled time</li>
                    <li>Test your audio and video equipment beforehand</li>
                    <li>Have any relevant documents ready for discussion</li>
                    <li>If you cannot attend, please notify the organizer</li>
                        <li>Ensure you have a stable internet connection</li>
                </ul>
            </div>
        </div>
        
        <div class="footer">
                <div class="footer-logo">SmartMeeting AI</div>
            <p>This invitation was sent by SmartMeeting AI</p>
            <p>If you have any questions, please contact the meeting organizer</p>
                <p style="margin-top: 15px; font-size: 12px; color: #adb5bd;">
                    © 2025 SmartMeeting AI. All rights reserved.
                </p>
            </div>
        </div>
    </body>
    </html>
    """

    return html_content


def create_mom_email_html(mom_data, summary):
    """Create beautiful and professional HTML email template for MoM distribution"""
    attendees_list = ""
    for attendee in mom_data.get('attendees', []):
        attendees_list += f"<li style='margin-bottom: 8px;'>{attendee}</li>"

    agenda_list = ""
    for item in mom_data.get('agenda', []):
        agenda_list += f"<li style='margin-bottom: 6px;'>{item}</li>"

    actions_list = ""
    for action in mom_data.get('actions', []):
        actions_list += f"<li style='margin-bottom: 8px;'>{action}</li>"

    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Minutes of Meeting - {mom_data.get('title', 'Meeting')}</title>
        <style>
            @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');
            
            * {{
                margin: 0;
                padding: 0;
                box-sizing: border-box;
            }}
            
            body {{
                font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                line-height: 1.6;
                color: #1f2937;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                margin: 0;
                padding: 20px 0;
                min-height: 100vh;
            }}
            
            .email-container {{
                max-width: 700px;
                margin: 0 auto;
                background-color: #ffffff;
                border-radius: 20px;
                box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1);
                overflow: hidden;
            }}
            
            .header {{
                background: linear-gradient(135deg, #1e40af 0%, #3b82f6 50%, #60a5fa 100%);
                color: white;
                padding: 50px 40px;
                text-align: center;
                position: relative;
                overflow: hidden;
            }}
            
            .header::before {{
                content: '';
                position: absolute;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><defs><pattern id="grain" width="100" height="100" patternUnits="userSpaceOnUse"><circle cx="25" cy="25" r="1" fill="white" opacity="0.1"/><circle cx="75" cy="75" r="1" fill="white" opacity="0.1"/><circle cx="50" cy="10" r="0.5" fill="white" opacity="0.1"/></pattern></defs><rect width="100" height="100" fill="url(%23grain)"/></svg>');
                opacity: 0.2;
            }}
            
            .header-content {{
                position: relative;
                z-index: 1;
            }}
            
            .header-icon {{
                font-size: 48px;
                margin-bottom: 20px;
                display: block;
            }}
            
            .header h1 {{
                margin: 0;
                font-size: 36px;
                font-weight: 700;
                letter-spacing: -1px;
                margin-bottom: 12px;
                text-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
            }}
            
            .header p {{
                margin: 0;
                font-size: 20px;
                font-weight: 400;
                opacity: 0.95;
                letter-spacing: 0.5px;
            }}
            
            .content {{
                padding: 50px 40px;
                background-color: #ffffff;
            }}
            
            .meeting-title {{
                font-size: 28px;
                font-weight: 700;
                color: #1f2937;
                margin-bottom: 40px;
                text-align: center;
                padding-bottom: 25px;
                border-bottom: 3px solid #e5e7eb;
                position: relative;
            }}
            
            .meeting-title::after {{
                content: '';
                position: absolute;
                bottom: -3px;
                left: 50%;
                transform: translateX(-50%);
                width: 60px;
                height: 3px;
                background: linear-gradient(90deg, #3b82f6, #8b5cf6);
                border-radius: 2px;
            }}
            
            .info-section {{
                background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
                border-radius: 16px;
                padding: 30px;
                margin-bottom: 30px;
                border: 1px solid #e2e8f0;
                box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);
                position: relative;
                overflow: hidden;
            }}
            
            .info-section::before {{
                content: '';
                position: absolute;
                top: 0;
                left: 0;
                width: 4px;
                height: 100%;
                background: linear-gradient(180deg, #3b82f6, #8b5cf6);
            }}
            
            .info-section h3 {{
                margin: 0 0 20px 0;
                color: #1e40af;
                font-size: 20px;
                font-weight: 600;
                display: flex;
                align-items: center;
                gap: 12px;
            }}
            
            .info-grid {{
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
                gap: 20px;
                margin-bottom: 20px;
            }}
            
            .info-item {{
                display: flex;
                align-items: center;
                gap: 12px;
                padding: 16px;
                background: white;
                border-radius: 12px;
                border: 1px solid #e2e8f0;
                box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
                transition: all 0.3s ease;
            }}
            
            .info-item:hover {{
                transform: translateY(-2px);
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
            }}
            
            .info-item strong {{
                color: #374151;
                font-weight: 600;
                min-width: 90px;
                font-size: 14px;
            }}
            
            .info-item span {{
                color: #1f2937;
                font-weight: 500;
                font-size: 15px;
            }}
            
            .summary-box {{
                background: linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%);
                border-radius: 16px;
                padding: 30px;
                margin: 30px 0;
                border: 1px solid #93c5fd;
                position: relative;
                overflow: hidden;
            }}
            
            .summary-box::before {{
                content: '';
                position: absolute;
                top: 0;
                left: 0;
                width: 4px;
                height: 100%;
                background: linear-gradient(180deg, #1d4ed8, #3b82f6);
            }}
            
            .summary-box h3 {{
                margin: 0 0 20px 0;
                color: #1e40af;
                font-size: 20px;
                font-weight: 600;
                display: flex;
                align-items: center;
                gap: 12px;
            }}
            
            .summary-box p {{
                margin: 0;
                color: #1e40af;
                font-weight: 500;
                line-height: 1.7;
                font-size: 16px;
            }}
            
            .agenda-list, .attendees-list, .actions-list {{
                list-style: none;
                padding: 0;
                margin: 0;
            }}
            
            .agenda-list li, .attendees-list li, .actions-list li {{
                padding: 16px 20px;
                margin-bottom: 12px;
                background: white;
                border-radius: 12px;
                border-left: 4px solid #3b82f6;
                box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
                transition: all 0.3s ease;
                position: relative;
            }}
            
            .agenda-list li:hover, .attendees-list li:hover {{
                transform: translateX(4px);
                box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
            }}
            
            .actions-list li {{
                border-left-color: #10b981;
                background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%);
                border: 1px solid #bbf7d0;
            }}
            
            .actions-list li:hover {{
                transform: translateX(4px);
                box-shadow: 0 4px 8px rgba(16, 185, 129, 0.2);
            }}
            
            .attachment-box {{
                background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
                border: 1px solid #f59e0b;
                border-radius: 16px;
                padding: 30px;
                margin: 30px 0;
                text-align: center;
                position: relative;
                overflow: hidden;
            }}
            
            .attachment-box::before {{
                content: '';
                position: absolute;
                top: 0;
                left: 0;
                width: 4px;
                height: 100%;
                background: linear-gradient(180deg, #d97706, #f59e0b);
            }}
            
            .attachment-box h3 {{
                margin: 0 0 15px 0;
                color: #92400e;
                font-size: 18px;
                font-weight: 600;
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 12px;
            }}
            
            .attachment-box p {{
                margin: 0;
                color: #92400e;
                font-size: 15px;
                font-weight: 500;
            }}
            
            .footer {{
                background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
                padding: 40px;
                text-align: center;
                border-top: 1px solid #e2e8f0;
            }}
            
            .footer-logo {{
                font-size: 24px;
                font-weight: 700;
                background: linear-gradient(135deg, #3b82f6, #8b5cf6);
                -webkit-background-clip: text;
                -webkit-text-fill-color: transparent;
                background-clip: text;
                margin-bottom: 15px;
                display: block;
            }}
            
            .footer p {{
                margin: 8px 0;
                color: #6b7280;
                font-size: 15px;
            }}
            
            .footer .copyright {{
                margin-top: 20px;
                font-size: 13px;
                color: #9ca3af;
                border-top: 1px solid #e5e7eb;
                padding-top: 15px;
            }}
            
            .badge {{
                display: inline-block;
                padding: 4px 12px;
                background: linear-gradient(135deg, #3b82f6, #8b5cf6);
                color: white;
                border-radius: 20px;
                font-size: 12px;
                font-weight: 600;
                text-transform: uppercase;
                letter-spacing: 0.5px;
            }}
            
            @media (max-width: 768px) {{
                body {{
                    padding: 10px 0;
                }}
                
                .email-container {{
                    margin: 0 10px;
                    border-radius: 16px;
                }}
                
                .header {{
                    padding: 40px 25px;
                }}
                
                .content {{
                    padding: 40px 25px;
                }}
                
                .info-grid {{
                    grid-template-columns: 1fr;
                }}
                
                .header h1 {{
                    font-size: 28px;
                }}
                
                .meeting-title {{
                    font-size: 24px;
                }}
            }}
        </style>
    </head>
    <body>
        <div class="email-container">
        <div class="header">
                <div class="header-content">
                    <span class="header-icon">📋</span>
                    <h1>Minutes of Meeting</h1>
                    <p>Professional Summary & Action Items</p>
                </div>
        </div>
        
        <div class="content">
                <div class="meeting-title">
                    {mom_data.get('title', 'Meeting')}
            </div>
            
                <div class="info-section">
                    <h3>📅 Meeting Details</h3>
                    <div class="info-grid">
                        <div class="info-item">
                            <strong>📅 Date:</strong>
                            <span>{mom_data.get('date', 'TBD')}</span>
                        </div>
                        <div class="info-item">
                            <strong>⏰ Time:</strong>
                            <span>{mom_data.get('time', 'TBD')}</span>
                        </div>
                        <div class="info-item">
                            <strong>📍 Venue:</strong>
                            <span>{mom_data.get('venue', 'TBD')}</span>
                        </div>
                        <div class="info-item">
                            <strong>👤 Organizer:</strong>
                            <span>{mom_data.get('organizer', 'TBD')}</span>
                        </div>
                    </div>
                </div>
                
                <div class="info-section">
                    <h3>👥 Attendees</h3>
                    <ul class="attendees-list">
                    {attendees_list}
                </ul>
            </div>
            
            {f'''
                <div class="info-section">
                    <h3>📋 Agenda</h3>
                    <ul class="agenda-list">
                    {agenda_list}
                </ul>
            </div>
            ''' if mom_data.get('agenda') else ''}
            
                <div class="summary-box">
                    <h3>📝 Executive Summary</h3>
                <p>{summary}</p>
            </div>
            
            {f'''
                <div class="info-section">
                    <h3>✅ Action Items</h3>
                    <ul class="actions-list">
                    {actions_list}
                </ul>
            </div>
            ''' if mom_data.get('actions') else ''}
            
                <div class="attachment-box">
                    <h3>📎 Complete Document</h3>
                    <p>The complete Minutes of Meeting document is attached to this email as a PDF file for your records.</p>
            </div>
        </div>
        
        <div class="footer">
                <span class="footer-logo">SmartMeeting AI</span>
                <p>This document was automatically generated by SmartMeeting AI</p>
                <p>Please review the attached PDF for complete meeting details</p>
                <p class="copyright">
                    © 2025 SmartMeeting AI. All rights reserved. | Powered by Advanced AI Technology
                </p>
            </div>
        </div>
    </body>
    </html>
    """

    return html_content


def send_email(to_email, subject, body=None, html_body=None, pdf_buffer=None, pdf_filename="Minutes_of_Meeting.pdf"):
    """Send email with optional PDF attachment"""
    msg = MIMEMultipart("mixed")
    msg['From'] = EMAIL_SENDER
    msg['To'] = to_email
    msg['Subject'] = subject

    alternative_part = MIMEMultipart('alternative')

    if body:
        alternative_part.attach(MIMEText(body, 'plain'))

    if html_body:
        alternative_part.attach(MIMEText(html_body, 'html'))

    msg.attach(alternative_part)

    if pdf_buffer:
        pdf_buffer.seek(0)
        pdf_data = pdf_buffer.read()
        pdf_attachment = MIMEApplication(pdf_data, _subtype="pdf")
        pdf_attachment.add_header(
            'Content-Disposition', 'attachment', filename=pdf_filename)
        msg.attach(pdf_attachment)

    try:
        with smtplib.SMTP(EMAIL_SMTP_SERVER, EMAIL_SMTP_PORT) as server:
            server.starttls()
            server.login(EMAIL_SENDER, EMAIL_PASSWORD)
            server.send_message(msg)
        print(f"✅ Email sent successfully to {to_email}")
        return True
    except Exception as e:
        print(f"❌ Failed to send email to {to_email}: {e}")
        return False


def create_mom_pdf(mom_data_dict):
    """Generate PDF from MoM data"""
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=letter,
                            topMargin=50, leftMargin=60, rightMargin=60, bottomMargin=50)
    styles = getSampleStyleSheet()

    title_style = ParagraphStyle(
        name='TitleStyle',
        parent=styles['Title'],
        fontSize=24,
        leading=28,
        textColor=colors.HexColor('#0A3D62'),
        spaceAfter=16,
    )

    section_title_style = ParagraphStyle(
        name='SectionTitleStyle',
        parent=styles['Heading2'],
        fontSize=16,
        leading=20,
        textColor=colors.HexColor('#1E3799'),
        spaceAfter=12,
        leftIndent=0,
        fontName='Helvetica-Bold'
    )

    normal_style = ParagraphStyle(
        name='NormalText',
        parent=styles['Normal'],
        fontSize=12,
        leading=16,
        textColor=colors.black,
        spaceAfter=6,
        leftIndent=0,
    )

    bullet_style = ParagraphStyle(
        name='BulletText',
        parent=normal_style,
        leftIndent=20,
        bulletIndent=10,
        fontSize=12,
        leading=16,
        textColor=colors.black,
    )

    elements = []

    title = mom_data_dict.get('title')
    if title:
        elements.append(Paragraph(title, title_style))
        elements.append(Spacer(1, 12))

    date = mom_data_dict.get('date')
    time = mom_data_dict.get('time')
    if date or time:
        dt_text = ""
        if date:
            dt_text += f"<b>Date:</b> {date} "
        if time:
            dt_text += f"<b>Time:</b> {time}"
        elements.append(Paragraph(dt_text.strip(), normal_style))
        elements.append(Spacer(1, 10))

    attendees = mom_data_dict.get('attendees')
    if attendees:
        if isinstance(attendees, list):
            attendees_str = ', '.join(attendees)
        else:
            attendees_str = str(attendees)
        elements.append(Paragraph("Attendees:", section_title_style))
        elements.append(Paragraph(attendees_str, normal_style))
        elements.append(Spacer(1, 12))

    agenda = mom_data_dict.get('agenda')
    if agenda:
        elements.append(Paragraph("Agenda:", section_title_style))
        if isinstance(agenda, list):
            for item in agenda:
                if item:
                    elements.append(Paragraph(f"• {item}", bullet_style))
        elements.append(Spacer(1, 12))

    discussions = mom_data_dict.get('discussions')
    if discussions:
        elements.append(Paragraph("Key Discussions:", section_title_style))
        elements.append(Spacer(1, 6))
        if isinstance(discussions, list):
            for idx, section in enumerate(discussions, start=1):
                sec_title = section.get('title', f"Section {idx}")
                elements.append(
                    Paragraph(f"{idx}. {sec_title}:", section_title_style))
                points = section.get('points', [])
                for point in points:
                    if isinstance(point, dict):
                        text = point.get('text', '')
                        if text:
                            elements.append(
                                Paragraph(f"• {text}", bullet_style))
                    else:
                        elements.append(Paragraph(f"• {point}", bullet_style))
                elements.append(Spacer(1, 8))
        elements.append(Spacer(1, 12))

    actions = mom_data_dict.get('actions')
    if actions:
        elements.append(
            Paragraph("Action Points / Decisions:", section_title_style))
        if isinstance(actions, list):
            for action in actions:
                elements.append(Paragraph(f"• {action}", bullet_style))
        elements.append(Spacer(1, 12))

    conclusion = mom_data_dict.get('conclusion')
    if conclusion:
        elements.append(Paragraph("Conclusion:", section_title_style))
        elements.append(Paragraph(str(conclusion), normal_style))
        elements.append(Spacer(1, 12))

    summary = mom_data_dict.get('summary')
    if summary:
        elements.append(Paragraph("Summary:", section_title_style))
        elements.append(Paragraph(str(summary), normal_style))
        elements.append(Spacer(1, 12))

    doc.build(elements)
    buffer.seek(0)
    return buffer


@app.route('/send-meeting-invitations', methods=['POST'])
def send_meeting_invitations_endpoint():
    """Send meeting invitation emails to attendees"""
    try:
        invitation_data = request.get_json()

        if not invitation_data or not invitation_data.get('attendees'):
            return jsonify({'error': 'No invitation data or attendees provided'}), 400

        # Create HTML email template
        html_body = create_meeting_invitation_html(invitation_data)

        # Send invitations to all attendees
        success_count = 0
        failed_emails = []

        for attendee in invitation_data['attendees']:
            email = attendee.get('email')
            name = attendee.get('name', email)

            if not email:
                continue

            subject = f"Meeting Invitation: {invitation_data.get('title', 'Meeting')}"

            success = send_email(
                to_email=email,
                subject=subject,
                html_body=html_body
            )

            if success:
                success_count += 1
            else:
                failed_emails.append(email)

        return jsonify({
            'success': True,
            'sent_count': success_count,
            'total_count': len(invitation_data['attendees']),
            'failed_emails': failed_emails
        })

    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/transcribe', methods=['POST'])
def transcribe():
    """Transcribe uploaded audio file"""
    if 'file' not in request.files:
        return jsonify({'error': 'No file provided'}), 400

    file = request.files['file']
    if file.filename == '':
        return jsonify({'error': 'No file selected'}), 400

    if not allowed_file(file.filename):
        return jsonify({'error': 'Invalid file type'}), 400

    try:
        filename = secure_filename(file.filename)
        filepath = os.path.join(UPLOAD_FOLDER, filename)
        file.save(filepath)

        transcription = transcribe_audio(filepath)

        # Clean up uploaded file
        os.remove(filepath)

        if not transcription:
            return jsonify({'error': 'Transcription failed'}), 500

        return jsonify(transcription)
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/generate-summary', methods=['POST'])
def generate_summary_endpoint():
    """Generate summary from transcript"""
    data = request.get_json()
    transcript = data.get('transcript', '')
    prompt = data.get(
        'prompt', 'Please summarize the following transcription:')

    if not transcript:
        return jsonify({'error': 'No transcript provided'}), 400

    try:
        summary = generate_summary(transcript, prompt)
        if not summary:
            return jsonify({'error': 'Summary generation failed'}), 500

        return jsonify({'summary': summary})
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/generate-mom', methods=['POST'])
def generate_mom_endpoint():
    """Generate Minutes of Meeting from transcript"""
    data = request.get_json()
    transcript = data.get('transcript', '')

    if not transcript:
        return jsonify({'error': 'No transcript provided'}), 400

    try:
        mom = generate_minutes_of_meeting(transcript)
        if not mom:
            return jsonify({'error': 'MoM generation failed'}), 500

        return jsonify({'mom': mom})
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/send-mom-email', methods=['POST'])
def send_mom_email_endpoint():
    """Send MoM via email"""
    try:
        recipients = json.loads(request.form.get('recipients', '[]'))
        mom = json.loads(request.form.get('mom', '{}'))
        summary = request.form.get('summary', '')
        transcript = request.form.get('transcript', '')

        if not recipients or not mom:
            return jsonify({'error': 'Missing required data'}), 400

        # Generate PDFs
        pdf_buffer_internal = create_mom_pdf(mom)
        customized_mom = customize_mom_for_external(mom)
        pdf_buffer_external = create_mom_pdf(customized_mom)

        # Create HTML email template
        html_body = create_mom_email_html(mom, summary)

        # Send emails
        success_count = 0
        failed_emails = []

        for recipient in recipients:
            email = recipient['email']
            recipient_type = recipient['type']

            subject = "Minutes of Meeting"
            if recipient_type == 'external':
                subject = "Customized Minutes of Meeting"

            success = send_email(
                to_email=email,
                subject=subject,
                html_body=html_body,
                pdf_buffer=pdf_buffer_internal if recipient_type == 'internal' else pdf_buffer_external
            )

            if success:
                success_count += 1
            else:
                failed_emails.append(email)

        return jsonify({
            'success': True,
            'sent_count': success_count,
            'total_count': len(recipients),
            'failed_emails': failed_emails
        })

    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/generate-pdf', methods=['POST'])
def generate_pdf_endpoint():
    """Generate PDF from MoM data"""
    data = request.get_json()
    mom = data.get('mom', {})

    if not mom:
        return jsonify({'error': 'No MoM data provided'}), 400

    try:
        pdf_buffer = create_mom_pdf(mom)
        return send_file(
            pdf_buffer,
            mimetype='application/pdf',
            as_attachment=True,
            download_name='Minutes_of_Meeting.pdf'
        )
    except Exception as e:
        return jsonify({'error': str(e)}), 500


def customize_mom_for_external(mom_dict):
    """Customize MoM for external recipients (remove sensitive information)"""
    redacted = copy.deepcopy(mom_dict)
    sensitive_keywords = ['confidential',
                          'internal', 'salary', 'budget', 'secret']

    if 'agenda' in redacted and isinstance(redacted['agenda'], list):
        redacted['agenda'] = [
            item for item in redacted['agenda']
            if not any(word in item.lower() for word in sensitive_keywords)
        ]

    if 'discussions' in redacted and isinstance(redacted['discussions'], list):
        filtered_discussions = []
        for section in redacted['discussions']:
            filtered_points = []
            for point in section.get('points', []):
                if isinstance(point, dict):
                    text_lower = point.get('text', '').lower()
                    if any(word in text_lower for word in sensitive_keywords):
                        continue
                    filtered_subpoints = [
                        sp for sp in point.get('subpoints', [])
                        if not any(word in sp.lower() for word in sensitive_keywords)
                    ]
                    filtered_points.append({
                        'text': point.get('text', ''),
                        'subpoints': filtered_subpoints
                    })
                elif isinstance(point, str):
                    if any(word in point.lower() for word in sensitive_keywords):
                        continue
                    filtered_points.append(point)
                else:
                    filtered_points.append(point)
            section['points'] = filtered_points
            filtered_discussions.append(section)
        redacted['discussions'] = filtered_discussions

    return redacted


# In-memory progress tracking
UPLOAD_PROGRESS = {}
UPLOAD_PROGRESS_LOCK = Lock()
CHUNKED_UPLOADS = {}


@app.route('/upload-drive-file', methods=['POST'])
def upload_drive_file_with_progress():
    """
    Upload endpoint for Google Drive with progress reporting.
    Accepts:
      - file: the file to upload (form-data)
      - meeting_id: meeting identifier (form-data)
    Returns:
      - upload_id: unique upload identifier for progress tracking
      - filename: uploaded filename
      - meeting_id: provided meeting ID
    Progress can be polled via /upload-drive-status/<upload_id>
    """
    file = request.files.get('file')
    meeting_id = request.form.get('meeting_id')

    logger.debug(f"Received upload request for meeting_id={meeting_id}")

    if not file or file.filename == '':
        logger.error("No file provided for upload")
        return jsonify({'error': 'No file provided'}), 400

    filename = secure_filename(file.filename)  # type: ignore
    local_path = os.path.join(UPLOAD_FOLDER, filename)
    file.save(local_path)
    mime_type = file.mimetype

    logger.info(
        f"Saved file '{filename}' to '{local_path}' (MIME: {mime_type})")

    upload_id = str(uuid.uuid4())
    with UPLOAD_PROGRESS_LOCK:
        CHUNKED_UPLOADS[upload_id] = {
            'progress': 0,
            'completed': False,
            'drive_file_id': None,
            'error': None,
            'status': 'initializing'
        }

    def progress_callback(current, total):
        percent = int((current / total) * 100) if total else 0
        with UPLOAD_PROGRESS_LOCK:
            CHUNKED_UPLOADS[upload_id]['progress'] = percent
            if percent > 0:
                CHUNKED_UPLOADS[upload_id]['status'] = 'uploading'

    def upload_worker():
        try:
            creds = get_authenticated_client()
            drive_service = build('drive', 'v3', credentials=creds)
            file_metadata = {
                'name': filename,
                'parents': ['1SMK_vY72wrzCpE9rOjXnyBTMt29-QqJy'],
            }
            # Use a smaller chunk size for easier progress tracking
            media = MediaFileUpload(
                local_path, mimetype=mime_type, resumable=True, chunksize=5 * 1024 * 1024)  # 5MB chunks
            request_drive = drive_service.files().create(
                body=file_metadata,
                media_body=media,
                fields='id'
            )
            response = None
            total_size = os.path.getsize(local_path)
            progress_callback(0, total_size)
            last_progress = 0
            while response is None:
                status, response = request_drive.next_chunk()
                if status:
                    current_progress = int(
                        (status.resumable_progress / total_size) * 100)
                    if current_progress > last_progress:
                        progress_callback(
                            status.resumable_progress, total_size)
                        last_progress = current_progress
                else:
                    progress_callback(last_progress, total_size)
            drive_file_id = response.get('id')
            
            # Save file information to Supabase
            if meeting_id:
                logger.info(f"Attempting to save file info to Supabase for meeting {meeting_id}")
                supabase_success = save_file_to_supabase(
                    meeting_id=meeting_id,
                    drive_file_id=drive_file_id,
                    original_filename=filename
                )
                if supabase_success:
                    logger.info(f"Successfully saved file info to Supabase for meeting {meeting_id}")
                    
                    # Start automatic transcription and MoM generation
                    start_auto_processing(meeting_id, drive_file_id, filename)
                else:
                    logger.warning(f"Failed to save file info to Supabase for meeting {meeting_id}")
            else:
                logger.warning("No meeting_id provided, skipping Supabase save")
            
            with UPLOAD_PROGRESS_LOCK:
                CHUNKED_UPLOADS[upload_id]['progress'] = 100
                CHUNKED_UPLOADS[upload_id]['completed'] = True
                CHUNKED_UPLOADS[upload_id]['drive_file_id'] = drive_file_id
                CHUNKED_UPLOADS[upload_id]['status'] = 'completed'
            logger.info(
                f"Uploaded '{filename}' to Google Drive (file_id={drive_file_id})")
        except Exception as e:
            logger.error(f"Google Drive upload failed: {e}")
            with UPLOAD_PROGRESS_LOCK:
                CHUNKED_UPLOADS[upload_id]['error'] = str(e)
                CHUNKED_UPLOADS[upload_id]['status'] = 'error'
            try:
                os.remove(local_path)
            except Exception:
                pass
        finally:
            try:
                os.remove(local_path)
            except Exception:
                pass
            logger.debug(f"Cleaned up local file '{local_path}' after upload")

    # Start upload in background thread
    thread = Thread(target=upload_worker)
    thread.start()

    return jsonify({
        'upload_id': upload_id,
        'filename': filename,
        'meeting_id': meeting_id
    })


@app.route('/upload-drive-status/<upload_id>', methods=['GET'])
def upload_drive_status(upload_id):
    """
    Returns progress (percentage) of backend-to-GDrive upload for given upload_id.
    """
    with UPLOAD_PROGRESS_LOCK:
        info = CHUNKED_UPLOADS.get(upload_id)
        logger.debug(f"Checking upload status for {upload_id}: {info}")
        if not info:
            return jsonify({'error': 'Invalid upload_id'}), 404
        
        # Don't include error field if there's no error
        response_data = {
            'progress': info.get('progress', 0),
            'completed': info.get('completed', False),
            'drive_file_id': info.get('drive_file_id'),
            'status': 'uploading' if not info.get('completed') else 'completed'
        }
        
        # Only include error if there actually is one
        if info.get('error'):
            response_data['error'] = info.get('error')
            response_data['status'] = 'error'
        
        return jsonify(response_data)


@app.route('/delete-drive-file', methods=['POST'])
def delete_drive_file_endpoint():
    data = request.get_json()
    if not data or 'fileId' not in data:
        return jsonify({'error': 'No fileId provided'}), 400
    file_id = data.get('fileId')
    success = delete_drive_file(file_id)
    if success:
        return jsonify({'success': True})
    else:
        return jsonify({'success': False}), 500


@app.route('/get-meeting-files/<meeting_id>', methods=['GET'])
def get_meeting_files_endpoint(meeting_id):
    """Get all files associated with a meeting from Supabase"""
    try:
        files = get_file_from_supabase(meeting_id)
        if files is not None:
            return jsonify({
                'success': True,
                'files': files
            })
        else:
            return jsonify({
                'success': False,
                'error': 'Failed to retrieve files from database'
            }), 500
    except Exception as e:
        logger.error(f"Error retrieving files for meeting {meeting_id}: {e}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@app.route('/get-meeting-minutes/<meeting_id>', methods=['GET'])
def get_meeting_minutes_endpoint(meeting_id):
    """Get transcript and MoM for a meeting from Supabase"""
    try:
        minutes = get_meeting_minutes_from_supabase(meeting_id)
        if minutes is not None:
            return jsonify({
                'success': True,
                'minutes': minutes
            })
        else:
            return jsonify({
                'success': False,
                'error': 'Failed to retrieve meeting minutes from database'
            }), 500
    except Exception as e:
        logger.error(f"Error retrieving meeting minutes for meeting {meeting_id}: {e}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


def get_meeting_minutes_from_supabase(meeting_id):
    """
    Retrieve meeting minutes (transcript and MoM) from Supabase
    """
    try:
        headers = {
            "apikey": SUPABASE_ANON_KEY,
            "Authorization": f"Bearer {SUPABASE_ANON_KEY}"
        }
        
        response = requests.get(
            f"{SUPABASE_URL}/rest/v1/meeting_minutes?meeting_id=eq.{meeting_id}",
            headers=headers
        )
        
        if response.status_code == 200:
            data = response.json()
            if data:
                # Parse the MoM JSON if it exists
                minutes = data[0]
                if minutes.get('full_mom'):
                    try:
                        minutes['full_mom'] = json.loads(minutes['full_mom'])
                    except:
                        pass  # Keep as string if parsing fails
                return minutes
            return None
        else:
            logger.error(f"Failed to retrieve meeting minutes from Supabase: {response.status_code}")
            return None
            
    except Exception as e:
        logger.error(f"Error retrieving meeting minutes from Supabase: {e}")
        return None


if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)
