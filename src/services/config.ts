// API Configuration
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

// Supabase Configuration
export const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://ryftlmknvgxodnxkilzg.supabase.co';
export const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ5ZnRsbWtudmd4b2RueGtpbHpnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQxMjY5MTAsImV4cCI6MjA2OTcwMjkxMH0.2iUReWBMETzYYg7W1O5vChy6UKv0_zMq0f7Lq3ydUus';

// API Endpoints
export const API_ENDPOINTS = {
  health: `${API_BASE_URL}/health`,
  transcribe: `${API_BASE_URL}/transcribe`,
  generateSummary: `${API_BASE_URL}/generate-summary`,
  generateMom: `${API_BASE_URL}/generate-mom`,
  sendMomEmail: `${API_BASE_URL}/send-mom-email`,
  generatePdf: `${API_BASE_URL}/generate-pdf`,
  uploadDriveFile: `${API_BASE_URL}/upload-drive-file`,
  uploadDriveStatus: `${API_BASE_URL}/upload-drive-status`,
  deleteDriveFile: `${API_BASE_URL}/delete-drive-file`,
  getMeetingFiles: `${API_BASE_URL}/get-meeting-files`,
  getMeetingMinutes: `${API_BASE_URL}/get-meeting-minutes`,
  sendMeetingInvitations: `${API_BASE_URL}/send-meeting-invitations`,
  // Google Drive Auth endpoints
  googleDriveAuth: `${API_BASE_URL}/auth/google-drive`,
  googleDriveCallback: `${API_BASE_URL}/auth/google-drive/callback`,
  googleDriveStatus: `${API_BASE_URL}/auth/google-drive/status`,
} as const;

// Environment check
export const isDevelopment = import.meta.env.DEV;
export const isProduction = import.meta.env.PROD;

// Legacy config for backward compatibility
export const config = {
  // Email Configuration
  EMAIL_PASSWORD: import.meta.env.VITE_EMAIL_PASSWORD || "",
  EMAIL_USER: import.meta.env.VITE_EMAIL_USER || "",
  
  // Supabase Configuration
  SUPABASE_URL: SUPABASE_URL,
  SUPABASE_ANON_KEY: SUPABASE_ANON_KEY,
  
  // API Endpoints
  ASSEMBLYAI_UPLOAD_ENDPOINT: "https://api.assemblyai.com/v2/upload",
  ASSEMBLYAI_TRANSCRIPT_ENDPOINT: "https://api.assemblyai.com/v2/transcript",
  GEMINI_API_ENDPOINT: "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent",
  
  // Email SMTP Configuration
  EMAIL_SMTP_SERVER: "smtp.gmail.com",
  EMAIL_SMTP_PORT: 587,
  EMAIL_SENDER: "theobserver.ai@gmail.com",
  
  // Backend API Configuration
  BACKEND_API_URL: API_BASE_URL,
};
