import { API_ENDPOINTS } from './config';

export interface GoogleDriveAuthStatus {
  success: boolean;
  authorized: boolean;
  message: string;
}

export interface GoogleDriveAuthResponse {
  success: boolean;
  auth_url?: string;
  message?: string;
  error?: string;
}

export class GoogleDriveAuthService {
  /**
   * Check if Google Drive is authorized
   */
  static async checkAuthStatus(): Promise<GoogleDriveAuthStatus> {
    try {
      const response = await fetch(API_ENDPOINTS.googleDriveStatus);
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error checking Google Drive auth status:', error);
      return {
        success: false,
        authorized: false,
        message: 'Failed to check authorization status'
      };
    }
  }

  /**
   * Initiate Google Drive OAuth flow
   */
  static async initiateAuth(): Promise<GoogleDriveAuthResponse> {
    try {
      const response = await fetch(API_ENDPOINTS.googleDriveAuth);
      const data = await response.json();
      
      if (data.success && data.auth_url) {
        // Open the auth URL in a new window
        window.open(data.auth_url, '_blank', 'width=500,height=600');
        return data;
      } else {
        return {
          success: false,
          error: data.error || 'Failed to get authorization URL'
        };
      }
    } catch (error) {
      console.error('Error initiating Google Drive auth:', error);
      return {
        success: false,
        error: 'Failed to initiate authorization'
      };
    }
  }

  /**
   * Handle OAuth callback (called after user authorizes)
   */
  static async handleCallback(code: string): Promise<GoogleDriveAuthResponse> {
    try {
      const response = await fetch(`${API_ENDPOINTS.googleDriveCallback}?code=${code}`);
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error handling Google Drive callback:', error);
      return {
        success: false,
        error: 'Failed to complete authorization'
      };
    }
  }

  /**
   * Poll for auth status (useful after initiating auth)
   */
  static async pollAuthStatus(maxAttempts: number = 10, interval: number = 2000): Promise<GoogleDriveAuthStatus> {
    for (let i = 0; i < maxAttempts; i++) {
      const status = await this.checkAuthStatus();
      if (status.authorized) {
        return status;
      }
      await new Promise(resolve => setTimeout(resolve, interval));
    }
    
    return {
      success: true,
      authorized: false,
      message: 'Authorization timeout'
    };
  }
}
