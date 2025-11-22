import { SubtitleCue } from '../types';

// Convert SRT time string (00:00:01,000) to seconds
const timeToSeconds = (timeString: string): number => {
  const [time, milliseconds] = timeString.split(',');
  const [hours, minutes, seconds] = time.split(':').map(Number);
  return hours * 3600 + minutes * 60 + seconds + Number(milliseconds) / 1000;
};

// Parse raw SRT string into structured Cue objects
export const parseSRT = (srtContent: string): SubtitleCue[] => {
  const cues: SubtitleCue[] = [];
  // Normalize line endings and remove BOM if present
  const normalized = srtContent.replace(/\r\n/g, '\n').trim();
  
  // Split by double newlines which usually separate cues
  const blocks = normalized.split('\n\n');

  blocks.forEach((block) => {
    const lines = block.split('\n');
    if (lines.length >= 3) {
      // Line 1: ID
      const id = lines[0].trim();
      
      // Line 2: Timing (00:00:01,000 --> 00:00:04,000)
      const timingLine = lines[1];
      const [startStr, endStr] = timingLine.split(' --> ');
      
      if (startStr && endStr) {
        // Line 3+: Text
        const text = lines.slice(2).join('\n').trim();
        
        cues.push({
          id,
          startTime: timeToSeconds(startStr.trim()),
          endTime: timeToSeconds(endStr.trim()),
          text,
        });
      }
    }
  });

  return cues;
};

// Download utility
export const downloadFile = (content: string, filename: string, type: string) => {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};
