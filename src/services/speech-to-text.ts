import { config } from './config';

export interface TranscriptSegment {
  speaker: string;
  start: number;
  text: string;
}

export interface TranscriptResult {
  text: string;
  segments: TranscriptSegment[];
}

export class SpeechToTextService {
  private static headers = {
    authorization: config.ASSEMBLYAI_API_KEY,
  };

  /**
   * Uploads audio/video file to AssemblyAI and returns an upload URL.
   */
  static async uploadFile(file: File): Promise<string> {
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch(config.ASSEMBLYAI_UPLOAD_ENDPOINT, {
      method: 'POST',
      headers: this.headers,
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`Upload failed: ${response.statusText}`);
    }

    const data = await response.json();
    const uploadUrl = data.upload_url;
    
    if (!uploadUrl) {
      throw new Error("No upload_url returned by AssemblyAI");
    }
    
    return uploadUrl;
  }

  /**
   * Requests transcription job with speaker diarization enabled.
   * Returns the transcript ID.
   */
  static async requestTranscript(uploadUrl: string): Promise<string> {
    const payload = {
      audio_url: uploadUrl,
      speaker_labels: true, // enables speaker diarization
      auto_chapters: false, // optional: disable chapters for simpler output
    };

    const response = await fetch(config.ASSEMBLYAI_TRANSCRIPT_ENDPOINT, {
      method: 'POST',
      headers: {
        ...this.headers,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(`Transcription request failed: ${response.statusText}`);
    }

    const data = await response.json();
    const transcriptId = data.id;
    
    if (!transcriptId) {
      throw new Error("Transcript ID not returned from AssemblyAI");
    }
    
    return transcriptId;
  }

  /**
   * Poll transcription status until complete or failed.
   * Returns the full JSON response on success, null on failure or timeout.
   */
  static async pollTranscription(
    transcriptId: string,
    pollInterval: number = 3000,
    timeout: number = 600000
  ): Promise<TranscriptResult | null> {
    const startTime = Date.now();
    
    while (Date.now() - startTime < timeout) {
      const response = await fetch(
        `${config.ASSEMBLYAI_TRANSCRIPT_ENDPOINT}/${transcriptId}`,
        { headers: this.headers }
      );

      if (!response.ok) {
        throw new Error(`Polling failed: ${response.statusText}`);
      }

      const data = await response.json();
      const status = data.status;

      if (status === 'completed') {
        return {
          text: data.text,
          segments: data.segments || [],
        };
      } else if (status === 'failed') {
        console.error(`Transcription failed: ${data.error}`);
        return null;
      } else {
        console.log(`Transcription status: ${status}. Waiting ${pollInterval}ms...`);
        await new Promise(resolve => setTimeout(resolve, pollInterval));
      }
    }

    console.error("Transcription polling timed out.");
    return null;
  }

  /**
   * Formats transcript JSON into a human-readable string with timestamps and speakers.
   */
  static formatTranscript(transcriptResult: TranscriptResult): string {
    if (!transcriptResult) {
      return "";
    }

    const segments = transcriptResult.segments;
    if (!segments || segments.length === 0) {
      return "(No speaker diarization data available)\n\n" + transcriptResult.text;
    }

    const lines: string[] = [];
    for (const seg of segments) {
      const speaker = seg.speaker || 'Speaker?';
      const start = seg.start / 1000;
      const minutes = Math.floor(start / 60);
      const seconds = Math.floor(start % 60);
      const timestamp = `[${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}]`;
      const text = seg.text?.trim() || '';
      lines.push(`${timestamp} Speaker ${speaker}: ${text}`);
    }

    return lines.join('\n');
  }

  /**
   * High-level function to get speaker-labeled transcription from a file.
   * Returns formatted transcript string or null on failure.
   */
  static async transcribeFile(file: File): Promise<{ text: string; formatted: string } | null> {
    try {
      console.log("Uploading file to AssemblyAI...");
      const uploadUrl = await this.uploadFile(file);

      console.log("Requesting transcription with speaker diarization...");
      const transcriptId = await this.requestTranscript(uploadUrl);

      console.log("Polling for transcription completion...");
      const transcriptResult = await this.pollTranscription(transcriptId);

      if (!transcriptResult) {
        console.error("Failed to get transcription result.");
        return null;
      }

      console.log("Formatting transcription with speaker labels...");
      const formattedText = this.formatTranscript(transcriptResult);
      
      return {
        text: transcriptResult.text,
        formatted: formattedText,
      };

    } catch (error) {
      console.error("Error in transcribeFile:", error);
      return null;
    }
  }
}
