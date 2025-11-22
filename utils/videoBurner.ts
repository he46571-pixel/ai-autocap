import { SubtitleCue } from '../types';

/**
 * Draws text on a canvas context with subtitle styling (white text, black outline/shadow)
 */
const drawSubtitle = (
  ctx: CanvasRenderingContext2D, 
  text: string, 
  canvasWidth: number, 
  canvasHeight: number
) => {
  if (!text) return;

  const fontSize = Math.floor(canvasHeight * 0.05); // 5% of video height
  ctx.font = `600 ${fontSize}px "Inter", sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'bottom';
  
  const x = canvasWidth / 2;
  // Position slightly above the bottom
  const y = canvasHeight - (canvasHeight * 0.1);

  // Handling multi-line text (for bilingual)
  const lines = text.split('\n');
  const lineHeight = fontSize * 1.2;
  
  // Draw lines in reverse order (bottom up) so Y calculation is easier
  lines.reverse().forEach((line, index) => {
    const lineY = y - (index * lineHeight);
    
    // Stroke (Black outline)
    ctx.lineWidth = fontSize * 0.15;
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.8)';
    ctx.strokeText(line, x, lineY);
    
    // Fill (White text)
    ctx.fillStyle = '#ffffff';
    ctx.fillText(line, x, lineY);
  });
};

/**
 * Burns subtitles into the video by playing it on a canvas and recording the stream.
 * Note: This processes in real-time (playback speed).
 */
export const burnSubtitlesAndExport = async (
  videoFile: File,
  cues: SubtitleCue[],
  onProgress: (percentage: number) => void
): Promise<Blob> => {
  return new Promise((resolve, reject) => {
    // Create hidden video element
    const video = document.createElement('video');
    video.src = URL.createObjectURL(videoFile);
    video.muted = true; // Mute element to avoid double audio, we capture tracks manually if needed
    video.crossOrigin = "anonymous";
    
    // Create Audio Context to capture audio track
    const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const dest = audioCtx.createMediaStreamDestination();
    
    video.onloadedmetadata = () => {
      const width = video.videoWidth;
      const height = video.videoHeight;
      const duration = video.duration;

      // Setup Canvas
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');

      if (!ctx) {
        reject(new Error("Canvas context not supported"));
        return;
      }

      // Setup MediaRecorder
      // Capture video from canvas
      const canvasStream = canvas.captureStream(30); // 30 FPS
      
      // Connect video audio to destination
      const sourceNode = audioCtx.createMediaElementSource(video);
      sourceNode.connect(dest);
      sourceNode.connect(audioCtx.destination); // Optional: let user hear it while processing? maybe mute for silence

      // Combine tracks (Canvas Video + Original Audio)
      const combinedTracks = [
        ...canvasStream.getVideoTracks(),
        ...dest.stream.getAudioTracks()
      ];
      const combinedStream = new MediaStream(combinedTracks);

      const chunks: BlobPart[] = [];
      // Prefer VP9 or H264 if available for better compatibility, fallback to default
      let mimeType = 'video/webm;codecs=vp9';
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        mimeType = 'video/webm'; // Fallback
      }

      const recorder = new MediaRecorder(combinedStream, {
        mimeType,
        videoBitsPerSecond: 5000000 // 5Mbps target
      });

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
      };

      recorder.onstop = () => {
        const blob = new Blob(chunks, { type: mimeType });
        // Cleanup
        URL.revokeObjectURL(video.src);
        audioCtx.close();
        resolve(blob);
      };

      // Render Loop
      const renderFrame = () => {
        if (video.paused || video.ended) return;

        // 1. Draw Video Frame
        ctx.drawImage(video, 0, 0, width, height);

        // 2. Find and Draw Subtitles
        const currentTime = video.currentTime;
        const activeCue = cues.find(c => currentTime >= c.startTime && currentTime <= c.endTime);
        
        if (activeCue) {
          drawSubtitle(ctx, activeCue.text, width, height);
        }

        // Update Progress
        const percent = Math.min(100, Math.round((currentTime / duration) * 100));
        onProgress(percent);

        requestAnimationFrame(renderFrame);
      };

      // Start Process
      recorder.start();
      video.play().then(() => {
        renderFrame();
      }).catch(reject);

      video.onended = () => {
        recorder.stop();
      };
      
      video.onerror = (e) => {
        reject(new Error("Video playback error during export"));
      };
    };
    
    video.onerror = () => reject(new Error("Failed to load video"));
  });
};
