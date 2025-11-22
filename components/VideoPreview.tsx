import React, { useRef, useEffect, useState } from 'react';
import { SubtitleCue } from '../types';

interface VideoPreviewProps {
  videoUrl: string;
  cues: SubtitleCue[];
  onTimeUpdate?: (currentTime: number) => void;
}

const VideoPreview: React.FC<VideoPreviewProps> = ({ videoUrl, cues, onTimeUpdate }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [currentText, setCurrentText] = useState<string>('');
  
  const handleTimeUpdate = () => {
    if (!videoRef.current) return;
    
    const time = videoRef.current.currentTime;
    if (onTimeUpdate) onTimeUpdate(time);

    // Find active cue
    const activeCue = cues.find(cue => time >= cue.startTime && time <= cue.endTime);
    setCurrentText(activeCue ? activeCue.text : '');
  };

  return (
    <div className="relative w-full aspect-video bg-black rounded-xl overflow-hidden shadow-2xl border border-slate-800">
      <video
        ref={videoRef}
        src={videoUrl}
        className="w-full h-full object-contain"
        controls
        onTimeUpdate={handleTimeUpdate}
        playsInline
      />
      
      {/* Subtitle Overlay */}
      {currentText && (
        <div className="absolute bottom-8 left-0 right-0 px-4 text-center pointer-events-none flex justify-center">
          <span 
            className="inline-block bg-black/60 text-white px-4 py-2 rounded-lg text-lg md:text-xl leading-snug font-medium shadow-sm backdrop-blur-sm whitespace-pre-line"
            style={{ textShadow: '1px 1px 2px rgba(0,0,0,0.8)' }}
          >
            {currentText}
          </span>
        </div>
      )}
    </div>
  );
};

export default VideoPreview;