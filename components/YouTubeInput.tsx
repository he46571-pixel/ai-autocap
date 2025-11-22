import React, { useState } from 'react';
import { Youtube, Link2, Loader2, AlertCircle } from 'lucide-react';
import { fetchYouTubeVideo } from '../utils/youtubeHelper';

interface YouTubeInputProps {
  onFileReady: (file: File) => void;
  disabled?: boolean;
}

const YouTubeInput: React.FC<YouTubeInputProps> = ({ onFileReady, disabled }) => {
  const [url, setUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [statusMsg, setStatusMsg] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleProcess = async () => {
    if (!url.trim()) return;
    
    // Basic validation
    if (!url.includes('youtube.com/') && !url.includes('youtu.be/')) {
      setError("請輸入有效的 YouTube 連結");
      return;
    }

    setError(null);
    setIsLoading(true);
    setStatusMsg("正在連線...");

    try {
      const file = await fetchYouTubeVideo(url, (msg) => setStatusMsg(msg));
      onFileReady(file);
    } catch (err: any) {
      setError(err.message);
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto">
      <div className={`
        relative
        border-2 border-slate-700 rounded-2xl p-8
        bg-slate-800/30
        flex flex-col items-center justify-center text-center
        transition-all duration-300
        ${isLoading ? 'opacity-90 pointer-events-none' : 'hover:border-red-500/50 hover:bg-slate-800/50'}
      `}>
        
        <div className="p-4 rounded-full mb-4 bg-slate-700/50 text-red-500">
          <Youtube className="w-10 h-10" />
        </div>

        <h3 className="text-xl font-semibold text-slate-200 mb-6">
          貼上 YouTube 連結
        </h3>

        <div className="w-full flex gap-2 mb-4">
          <div className="relative flex-1">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Link2 className="h-5 w-5 text-slate-400" />
            </div>
            <input
              type="text"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://www.youtube.com/watch?v=..."
              disabled={disabled || isLoading}
              className="block w-full pl-10 pr-3 py-3 border border-slate-600 rounded-lg leading-5 bg-slate-900/50 text-slate-300 placeholder-slate-500 focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 sm:text-sm transition-colors"
            />
          </div>
          <button
            onClick={handleProcess}
            disabled={disabled || isLoading || !url}
            className="px-6 py-3 bg-red-600 hover:bg-red-700 disabled:bg-slate-700 text-white font-medium rounded-lg transition-colors flex items-center gap-2 whitespace-nowrap"
          >
            {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : '載入影片'}
          </button>
        </div>

        <p className="text-slate-400 text-sm max-w-md">
          系統將下載影片至瀏覽器暫存區，隨後進行 AI 字幕辨識與雙語翻譯。
        </p>

        {isLoading && (
          <div className="mt-4 text-indigo-400 text-sm animate-pulse flex items-center">
            <Loader2 className="w-3 h-3 mr-2 animate-spin" />
            {statusMsg}
          </div>
        )}

        {error && (
          <div className="absolute -bottom-12 left-0 right-0 flex items-center justify-center text-red-400 text-sm animate-pulse">
            <AlertCircle className="w-4 h-4 mr-2" />
            {error}
          </div>
        )}
      </div>
    </div>
  );
};

export default YouTubeInput;