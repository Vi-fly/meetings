/**
 * File Upload Service
 * Handles file uploads to Google Drive with automatic Supabase integration
 */

export interface FileUploadResponse {
  upload_id: string;
  filename: string;
  meeting_id: string;
}

export interface UploadStatus {
  progress: number;
  completed: boolean;
  drive_file_id?: string;
  error?: string;
  status: 'initializing' | 'uploading' | 'completed' | 'error';
}

export interface MeetingFile {
  meeting_id: string;
  drive_share_link: string;
  original_filename: string;
  uploaded_at: string;
  uploaded_by?: string;
}

export interface MeetingMinutes {
  meeting_id: string;
  transcript?: string;
  summary?: string;
  full_mom?: any;
  created_at?: string;
  updated_at?: string;
}

export class FileUploadService {
  private baseUrl: string;

  constructor(baseUrl: string = 'http://localhost:5000') {
    this.baseUrl = baseUrl;
  }

  /**
   * Upload a file to Google Drive and save metadata to Supabase
   * @param file - The file to upload
   * @param meetingId - The meeting ID to associate with the file
   * @returns Promise with upload response
   */
  async uploadFile(file: File, meetingId: string): Promise<FileUploadResponse> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('meeting_id', meetingId);

    const response = await fetch(`${this.baseUrl}/upload-drive-file`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`Upload failed: ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Check the status of an upload
   * @param uploadId - The upload ID returned from uploadFile
   * @returns Promise with upload status
   */
  async getUploadStatus(uploadId: string): Promise<UploadStatus> {
    const response = await fetch(`${this.baseUrl}/upload-drive-status/${uploadId}`);

    if (!response.ok) {
      throw new Error(`Status check failed: ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Get all files associated with a meeting
   * @param meetingId - The meeting ID
   * @returns Promise with array of meeting files
   */
  async getMeetingFiles(meetingId: string): Promise<MeetingFile[]> {
    const response = await fetch(`${this.baseUrl}/get-meeting-files/${meetingId}`);

    if (!response.ok) {
      throw new Error(`Failed to get meeting files: ${response.statusText}`);
    }

    const data = await response.json();
    
    if (!data.success) {
      throw new Error(data.error || 'Failed to retrieve files');
    }

    return data.files || [];
  }

  /**
   * Get meeting minutes (transcript and MoM) for a meeting
   * @param meetingId - The meeting ID
   * @returns Promise with meeting minutes
   */
  async getMeetingMinutes(meetingId: string): Promise<MeetingMinutes | null> {
    const response = await fetch(`${this.baseUrl}/get-meeting-minutes/${meetingId}`);

    if (!response.ok) {
      throw new Error(`Failed to get meeting minutes: ${response.statusText}`);
    }

    const data = await response.json();
    
    if (!data.success) {
      return null; // No minutes available yet
    }

    return data.minutes || null;
  }

  /**
   * Upload file with progress tracking
   * @param file - The file to upload
   * @param meetingId - The meeting ID
   * @param onProgress - Progress callback function
   * @returns Promise with final upload result
   */
  async uploadFileWithProgress(
    file: File, 
    meetingId: string, 
    onProgress?: (progress: number) => void
  ): Promise<{ success: boolean; driveFileId?: string; error?: string }> {
    try {
      // Start upload
      const uploadResponse = await this.uploadFile(file, meetingId);
      
      // Poll for status
      const pollInterval = setInterval(async () => {
        try {
          const status = await this.getUploadStatus(uploadResponse.upload_id);
          
          if (onProgress) {
            onProgress(status.progress);
          }

          if (status.completed) {
            clearInterval(pollInterval);
            return {
              success: true,
              driveFileId: status.drive_file_id
            };
          }

          if (status.error) {
            clearInterval(pollInterval);
            return {
              success: false,
              error: status.error
            };
          }
        } catch (error) {
          clearInterval(pollInterval);
          return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
          };
        }
      }, 1000); // Poll every second

      // Wait for completion or timeout
      return new Promise((resolve) => {
        setTimeout(() => {
          clearInterval(pollInterval);
          resolve({
            success: false,
            error: 'Upload timeout'
          });
        }, 300000); // 5 minute timeout
      });

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Upload failed'
      };
    }
  }

  /**
   * Delete a file from Google Drive
   * @param fileId - The Google Drive file ID
   * @returns Promise with deletion result
   */
  async deleteFile(fileId: string): Promise<boolean> {
    const response = await fetch(`${this.baseUrl}/delete-drive-file`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ fileId }),
    });

    if (!response.ok) {
      throw new Error(`Delete failed: ${response.statusText}`);
    }

    const result = await response.json();
    return result.success;
  }
}

// Export a default instance
export const fileUploadService = new FileUploadService();

// Export utility functions for common operations
export const uploadMeetingVideo = async (
  file: File, 
  meetingId: string, 
  onProgress?: (progress: number) => void
) => {
  return fileUploadService.uploadFileWithProgress(file, meetingId, onProgress);
};

export const getMeetingVideos = async (meetingId: string) => {
  return fileUploadService.getMeetingFiles(meetingId);
};

export const getMeetingMinutes = async (meetingId: string) => {
  return fileUploadService.getMeetingMinutes(meetingId);
};

export const deleteMeetingVideo = async (fileId: string) => {
  return fileUploadService.deleteFile(fileId);
};
