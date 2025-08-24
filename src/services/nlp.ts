import { config } from './config';

export interface MinutesOfMeeting {
  title: string;
  date: string;
  time: string;
  attendees: string[];
  agenda: string[];
  discussions: Array<{
    section: string;
    points: Array<{
      text: string;
      subpoints?: string[];
    }>;
  }>;
  actions: string[];
  conclusion: string;
  summary: string;
}

export class NLPService {
  /**
   * Generate summary from transcript using Gemini AI
   */
  static async generateSummary(transcript: string, prompt: string): Promise<string | null> {
    try {
      const response = await fetch(
        `${config.GEMINI_API_ENDPOINT}?key=${config.GEMINI_API_KEY}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            contents: [{
              parts: [{
                text: `${prompt}\n\n${transcript}`
              }]
            }]
          }),
        }
      );

      if (!response.ok) {
        throw new Error(`Gemini API request failed: ${response.statusText}`);
      }

      const data = await response.json();
      return data.candidates?.[0]?.content?.parts?.[0]?.text || null;
    } catch (error) {
      console.error("[NLP] Summary generation failed:", error);
      return null;
    }
  }

  /**
   * Generate detailed minutes of meeting (MoM) from transcript
   */
  static async generateMinutesOfMeeting(transcript: string): Promise<MinutesOfMeeting | null> {
    const prompt = `
Generate detailed Minutes of Meeting (MoM) from the following transcript. 
Return the result as a JSON object with the following fields:
- title (string): Meeting title
- date (string): Meeting date
- time (string): Meeting time
- attendees (list of strings): List of attendees
- agenda (list of strings): Meeting agenda items
- discussions (list of sections): Each section contains points or paragraphs
- actions (list of strings): Action items and decisions
- conclusion (string): Meeting conclusion
- summary (string): Overall meeting summary

Ensure the JSON is properly formatted and valid.
`;

    const rawResponse = await this.generateSummary(transcript, prompt);
    if (!rawResponse) {
      return null;
    }

    try {
      // Extract JSON from response
      const start = rawResponse.indexOf('{');
      const end = rawResponse.lastIndexOf('}') + 1;
      const jsonStr = rawResponse.substring(start, end);
      const momData = JSON.parse(jsonStr);
      
      return momData as MinutesOfMeeting;
    } catch (error) {
      console.error("[NLP] Failed to parse MoM JSON:", error);
      console.error("[NLP] Raw response:", rawResponse);
      return null;
    }
  }

  /**
   * Format minutes of meeting as markdown
   */
  static formatMinutesAsMarkdown(mom: MinutesOfMeeting): string {
    const lines: string[] = [];

    // Title
    lines.push(`# ${mom.title || 'Meeting Minutes'}`);
    lines.push('');

    // Meeting details
    if (mom.date || mom.time) {
      lines.push('## Meeting Details');
      if (mom.date) lines.push(`**Date:** ${mom.date}`);
      if (mom.time) lines.push(`**Time:** ${mom.time}`);
      lines.push('');
    }

    // Attendees
    if (mom.attendees && mom.attendees.length > 0) {
      lines.push('## Attendees');
      mom.attendees.forEach(attendee => lines.push(`- ${attendee}`));
      lines.push('');
    }

    // Agenda
    if (mom.agenda && mom.agenda.length > 0) {
      lines.push('## Agenda');
      mom.agenda.forEach(item => lines.push(`- ${item}`));
      lines.push('');
    }

    // Discussions
    if (mom.discussions && mom.discussions.length > 0) {
      lines.push('## Discussions');
      mom.discussions.forEach(section => {
        if (section.section) {
          lines.push(`### ${section.section}`);
        }
        if (section.points) {
          section.points.forEach(point => {
            if (typeof point === 'string') {
              lines.push(`- ${point}`);
            } else if (point.text) {
              lines.push(`- ${point.text}`);
              if (point.subpoints) {
                point.subpoints.forEach(subpoint => {
                  lines.push(`  - ${subpoint}`);
                });
              }
            }
          });
        }
        lines.push('');
      });
    }

    // Actions
    if (mom.actions && mom.actions.length > 0) {
      lines.push('## Action Items');
      mom.actions.forEach(action => lines.push(`- ${action}`));
      lines.push('');
    }

    // Conclusion
    if (mom.conclusion) {
      lines.push('## Conclusion');
      lines.push(mom.conclusion);
      lines.push('');
    }

    // Summary
    if (mom.summary) {
      lines.push('## Summary');
      lines.push(mom.summary);
    }

    return lines.join('\n');
  }
}
