import jsPDF from 'jspdf';
import { MinutesOfMeeting } from './nlp';

export class PDFService {
  /**
   * Generate PDF from minutes of meeting data
   */
  static generateMinutesPDF(mom: MinutesOfMeeting): ArrayBuffer {
    const doc = new jsPDF();
    
    // Set up styles
    const titleFontSize = 20;
    const headingFontSize = 14;
    const bodyFontSize = 12;
    const margin = 20;
    let yPosition = margin;

    // Title
    doc.setFontSize(titleFontSize);
    doc.setFont('helvetica', 'bold');
    doc.text(mom.title || 'Meeting Minutes', margin, yPosition);
    yPosition += 15;

    // Meeting details
    doc.setFontSize(bodyFontSize);
    doc.setFont('helvetica', 'normal');
    if (mom.date || mom.time) {
      doc.setFont('helvetica', 'bold');
      doc.text('Meeting Details:', margin, yPosition);
      yPosition += 8;
      doc.setFont('helvetica', 'normal');
      
      if (mom.date) {
        doc.text(`Date: ${mom.date}`, margin + 5, yPosition);
        yPosition += 6;
      }
      if (mom.time) {
        doc.text(`Time: ${mom.time}`, margin + 5, yPosition);
        yPosition += 6;
      }
      yPosition += 5;
    }

    // Attendees
    if (mom.attendees && mom.attendees.length > 0) {
      doc.setFont('helvetica', 'bold');
      doc.text('Attendees:', margin, yPosition);
      yPosition += 8;
      doc.setFont('helvetica', 'normal');
      
      mom.attendees.forEach(attendee => {
        doc.text(`• ${attendee}`, margin + 5, yPosition);
        yPosition += 6;
      });
      yPosition += 5;
    }

    // Agenda
    if (mom.agenda && mom.agenda.length > 0) {
      doc.setFont('helvetica', 'bold');
      doc.text('Agenda:', margin, yPosition);
      yPosition += 8;
      doc.setFont('helvetica', 'normal');
      
      mom.agenda.forEach(item => {
        doc.text(`• ${item}`, margin + 5, yPosition);
        yPosition += 6;
      });
      yPosition += 5;
    }

    // Discussions
    if (mom.discussions && mom.discussions.length > 0) {
      doc.setFont('helvetica', 'bold');
      doc.text('Discussions:', margin, yPosition);
      yPosition += 8;
      doc.setFont('helvetica', 'normal');
      
      mom.discussions.forEach(section => {
        if (section.section) {
          doc.setFont('helvetica', 'bold');
          doc.text(`${section.section}:`, margin + 5, yPosition);
          yPosition += 6;
          doc.setFont('helvetica', 'normal');
        }
        
        if (section.points) {
          section.points.forEach(point => {
            if (typeof point === 'string') {
              doc.text(`• ${point}`, margin + 10, yPosition);
              yPosition += 6;
            } else if (point.text) {
              doc.text(`• ${point.text}`, margin + 10, yPosition);
              yPosition += 6;
              
              if (point.subpoints) {
                point.subpoints.forEach(subpoint => {
                  doc.text(`  - ${subpoint}`, margin + 15, yPosition);
                  yPosition += 6;
                });
              }
            }
          });
        }
        yPosition += 3;
      });
    }

    // Actions
    if (mom.actions && mom.actions.length > 0) {
      doc.setFont('helvetica', 'bold');
      doc.text('Action Items:', margin, yPosition);
      yPosition += 8;
      doc.setFont('helvetica', 'normal');
      
      mom.actions.forEach(action => {
        doc.text(`• ${action}`, margin + 5, yPosition);
        yPosition += 6;
      });
      yPosition += 5;
    }

    // Conclusion
    if (mom.conclusion) {
      doc.setFont('helvetica', 'bold');
      doc.text('Conclusion:', margin, yPosition);
      yPosition += 8;
      doc.setFont('helvetica', 'normal');
      
      const conclusionLines = this.splitTextToFit(doc, mom.conclusion, 170);
      conclusionLines.forEach(line => {
        doc.text(line, margin + 5, yPosition);
        yPosition += 6;
      });
      yPosition += 5;
    }

    // Summary
    if (mom.summary) {
      doc.setFont('helvetica', 'bold');
      doc.text('Summary:', margin, yPosition);
      yPosition += 8;
      doc.setFont('helvetica', 'normal');
      
      const summaryLines = this.splitTextToFit(doc, mom.summary, 170);
      summaryLines.forEach(line => {
        doc.text(line, margin + 5, yPosition);
        yPosition += 6;
      });
    }

    // Add page numbers
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(10);
      doc.text(`Page ${i} of ${pageCount}`, 190, 280, { align: 'right' });
    }

    return doc.output('arraybuffer');
  }

  /**
   * Split text to fit within PDF width
   */
  private static splitTextToFit(doc: jsPDF, text: string, maxWidth: number): string[] {
    const words = text.split(' ');
    const lines: string[] = [];
    let currentLine = '';

    words.forEach(word => {
      const testLine = currentLine ? `${currentLine} ${word}` : word;
      const testWidth = doc.getTextWidth(testLine);
      
      if (testWidth > maxWidth && currentLine) {
        lines.push(currentLine);
        currentLine = word;
      } else {
        currentLine = testLine;
      }
    });

    if (currentLine) {
      lines.push(currentLine);
    }

    return lines;
  }

  /**
   * Download PDF file
   */
  static downloadPDF(pdfBuffer: ArrayBuffer, filename: string = 'meeting_minutes.pdf'): void {
    const blob = new Blob([pdfBuffer], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }
}
