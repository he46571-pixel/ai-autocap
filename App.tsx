import React, { useState, useEffect } from 'react';
import { FileVideo, Download, RefreshCw, CheckCircle2, Loader2, Sparkles, AlertTriangle, Film, Youtube, HardDrive } from 'lucide-react';
import { AppStatus, SubtitleCue, VideoData } from './types';
import { generateSubtitles } from './services/geminiService';
import { parseSRT, downloadFile } from './utils/srtHelper';
import { burnSubtitlesAndExport } from './utils/videoBurner';
import FileUpload from './components/FileUpload';
import YouTubeInput from './components/YouTubeInput';
import VideoPreview from './components/VideoPreview';

const App: React.FC = () => {
  const [status, setStatus] = useState<AppStatus>(AppStatus.IDLE);
  const [videoData, setVideoData] = useState<VideoData | null>(null);
  const [rawSrt, setRawSrt] = useState<string>('');
  const [cues, setCues] = useState<SubtitleCue[]>([]);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [progressMessage, setProgressMessage] = useState<string>('');
  
  // Tabs: 'local' | 'youtube'
  const [inputMode, setInputMode] = useState<'local' | 'youtube'>('local');

  // Export State
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);

  // Convert file to Base64 for Gemini
  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const result = reader.result as string;
        const base64 = result.split(',')[1];
        resolve(base64);
      };
      reader.onerror = (error) => reject(error);
    });
  };

  const processVideoFile = async (file: File) => {
    setStatus(AppStatus.UPLOADING);
    setErrorMessage('');
    setRawSrt('');
    setCues([]);
    
    const url = URL.createObjectURL(file);
    setVideoData({ file, url, duration: 0 });

    try {
      setProgressMessage('正在準備影片進行 AI 分析...');
      const base64 = await fileToBase64(file);

      setStatus(AppStatus.PROCESSING);
      setProgressMessage('AI 正在辨識語音並翻譯（英文將自動翻譯為繁體中文）...');
      
      const srtOutput = await generateSubtitles(base64, file.type || 'video/mp4');
      
      setRawSrt(srtOutput);
      const parsedCues = parseSRT(srtOutput);
      setCues(parsedCues);
      
      setStatus(AppStatus.COMPLETED);
    } catch (error: any) {
      console.error(error);
      setStatus(AppStatus.ERROR);
      let msg = "影片處理失敗。";
      if (error.message?.includes('413')) {
        msg = "影片檔案過大，超出展示版 API 限制。請嘗試較短的片段。";
      } else if (error.message) {
        msg = error.message;
      }
      setErrorMessage(msg);
    }
  };

  const handleReset = () => {
    if (videoData?.url) URL.revokeObjectURL(videoData.url);
    setVideoData(null);
    setRawSrt('');
    setCues([]);
    setStatus(AppStatus.IDLE);
    setErrorMessage('');
    setIsExporting(false);
    setExportProgress(0);
  };

  const handleDownloadSrt = () => {
    if (!rawSrt || !videoData) return;
    const filename = videoData.file.name.replace(/\.[^/.]+$/, "") + ".srt";
    downloadFile(rawSrt, filename, 'text/plain');
  };

  const handleExportVideo = async () => {
    if (!videoData || cues.length === 0) return;
    
    setIsExporting(true);
    setExportProgress(0);
    
    try {
      const blob = await burnSubtitlesAndExport(videoData.file, cues, (progress) => {
        setExportProgress(progress);
      });
      
      const filename = videoData.file.name.replace(/\.[^/.]+$/, "") + "_subtitled.webm";
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
    } catch (error) {
      console.error("Export failed", error);
      alert("影片合成失敗，請重試。");
    } finally {
      setIsExporting(false);
      setExportProgress(0);
    }
  };

  useEffect(() => {
    return () => {
      if (videoData?.url) URL.revokeObjectURL(videoData.url);
    };
  }, [videoData]);

  return (
    <div className="min-h-screen w-full bg-slate-900 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-800 via-slate-900 to-slate-950 text-slate-100 selection:bg-indigo-500/30">
      
      {/* Header */}
      <header className="border-b border-slate-800 backdrop-blur-md sticky top-0 z-50 bg-slate-900/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-gradient-to-br from-indigo-500 to-violet-600 p-2 rounded-lg">
              <FileVideo className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400">
              AutoCap
            </span>
          </div>
          <div className="flex items-center gap-4 text-sm font-medium text-slate-400">
            <div className="hidden sm:flex items-center gap-1">
              <Sparkles className="w-4 h-4 text-yellow-400" />
              <span>雙語 AI 辨識 (中/英)</span>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        
        {/* Introduction / Upload State */}
        {status === AppStatus.IDLE && (
          <div className="flex flex-col items-center justify-center space-y-8 py-8 animate-fade-in">
            <div className="text-center max-w-3xl space-y-4 mb-4">
              <h1 className="text-4xl md:text-6xl font-bold tracking-tight text-white">
                AI 影片字幕產生器<br />
                <span className="text-indigo-400">支援英翻中、雙語顯示、YouTube 下載。</span>
              </h1>
              <p className="text-lg text-slate-400 max-w-2xl mx-auto">
                AI 自動偵測語言，若是英文則自動翻譯為繁中並顯示雙語字幕。支援本機檔案或 YouTube 連結。
              </p>
            </div>

            {/* Tabs */}
            <div className="flex space-x-2 p-1 bg-slate-800/50 rounded-xl border border-slate-700/50">
              <button
                onClick={() => setInputMode('local')}
                className={`flex items-center px-6 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  inputMode === 'local' 
                    ? 'bg-indigo-600 text-white shadow-lg' 
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                }`}
              >
                <HardDrive className="w-4 h-4 mr-2" />
                上傳檔案
              </button>
              <button
                onClick={() => setInputMode('youtube')}
                className={`flex items-center px-6 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  inputMode === 'youtube' 
                    ? 'bg-red-600 text-white shadow-lg' 
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                }`}
              >
                <Youtube className="w-4 h-4 mr-2" />
                YouTube 連結
              </button>
            </div>
            
            <div className="w-full transition-all duration-500 ease-in-out">
              {inputMode === 'local' ? (
                <FileUpload onFileSelect={processVideoFile} />
              ) : (
                <YouTubeInput onFileReady={processVideoFile} />
              )}
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 w-full max-w-4xl mt-12">
              {[
                { title: "智慧雙語翻譯", desc: "英文影片會自動產生「英文+繁體中文」雙語字幕。" },
                { title: "直接嵌入下載", desc: "不只是 SRT，還可以直接下載已嵌入字幕的影片檔。" },
                { title: "YouTube 支援", desc: "貼上連結，系統自動下載影片並進行 AI 辨識處理。" }
              ].map((feature, i) => (
                <div key={i} className="p-6 rounded-2xl bg-slate-800/40 border border-slate-700 hover:border-slate-600 transition-colors">
                  <h3 className="font-semibold text-indigo-300 mb-2">{feature.title}</h3>
                  <p className="text-slate-400 text-sm">{feature.desc}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Processing State */}
        {(status === AppStatus.UPLOADING || status === AppStatus.PROCESSING) && (
          <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-6">
            <div className="relative">
              <div className="absolute inset-0 bg-indigo-500 blur-xl opacity-20 rounded-full animate-pulse"></div>
              <Loader2 className="w-16 h-16 text-indigo-400 animate-spin relative z-10" />
            </div>
            <div className="text-center space-y-2">
              <h2 className="text-2xl font-semibold text-white">正在處理影片</h2>
              <p className="text-slate-400">{progressMessage}</p>
            </div>
          </div>
        )}

        {/* Error State */}
        {status === AppStatus.ERROR && (
          <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-6">
             <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl flex flex-col items-center max-w-md text-center">
                <AlertTriangle className="w-10 h-10 text-red-400 mb-4" />
                <h3 className="text-xl font-semibold text-red-200 mb-2">處理失敗</h3>
                <p className="text-red-300/80 mb-6">{errorMessage}</p>
                <button 
                  onClick={handleReset}
                  className="px-6 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-medium transition-colors"
                >
                  嘗試其他檔案
                </button>
             </div>
          </div>
        )}

        {/* Completed State */}
        {status === AppStatus.COMPLETED && videoData && (
          <div className="grid lg:grid-cols-3 gap-8 animate-in fade-in slide-in-from-bottom-8 duration-700">
            
            {/* Left Column: Video Preview */}
            <div className="lg:col-span-2 space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <h2 className="text-2xl font-semibold flex items-center gap-2">
                  <CheckCircle2 className="w-6 h-6 text-green-400" />
                  預覽與下載
                </h2>
                
                <div className="flex flex-wrap gap-3">
                   <button 
                    onClick={handleReset}
                    disabled={isExporting}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-slate-300 hover:bg-slate-800 transition-colors disabled:opacity-50"
                  >
                    <RefreshCw className="w-4 h-4" />
                    重來
                  </button>
                  
                  <button 
                    onClick={handleDownloadSrt}
                    disabled={isExporting}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-slate-700 hover:bg-slate-600 text-white transition-all disabled:opacity-50"
                  >
                    <Download className="w-4 h-4" />
                    SRT 字幕
                  </button>

                  <button 
                    onClick={handleExportVideo}
                    disabled={isExporting}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white shadow-lg shadow-indigo-500/20 transition-all ${isExporting ? 'bg-indigo-600 cursor-wait' : 'bg-indigo-600 hover:bg-indigo-500'}`}
                  >
                    {isExporting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        合成中 {exportProgress}%
                      </>
                    ) : (
                      <>
                        <Film className="w-4 h-4" />
                        嵌入並下載影片
                      </>
                    )}
                  </button>
                </div>
              </div>

              <VideoPreview videoUrl={videoData.url} cues={cues} />

              {isExporting && (
                <div className="w-full bg-slate-800 rounded-full h-2.5 overflow-hidden">
                  <div 
                    className="bg-indigo-500 h-2.5 rounded-full transition-all duration-300 ease-out" 
                    style={{ width: `${exportProgress}%` }}
                  ></div>
                </div>
              )}

              <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700/50">
                <div className="flex items-center gap-3 mb-2">
                   <div className="w-10 h-10 rounded-lg bg-slate-700 flex items-center justify-center">
                      <FileVideo className="w-5 h-5 text-slate-300" />
                   </div>
                   <div>
                      <p className="font-medium text-white">{videoData.file.name}</p>
                      <p className="text-sm text-slate-400">
                        {(videoData.file.size / (1024 * 1024)).toFixed(2)} MB • {videoData.file.type}
                      </p>
                   </div>
                </div>
                <p className="text-xs text-slate-500 ml-14">
                  提示：下載嵌入字幕的影片時，瀏覽器會即時播放並錄製影片，這需要花費與影片長度相同的時間。
                </p>
              </div>
            </div>

            {/* Right Column: Subtitle List */}
            <div className="lg:col-span-1 h-full">
               <div className="bg-slate-800/30 border border-slate-700 rounded-xl h-[600px] flex flex-col overflow-hidden">
                  <div className="p-4 border-b border-slate-700 bg-slate-800/50 backdrop-blur">
                    <h3 className="font-semibold text-slate-200">字幕列表</h3>
                    <p className="text-xs text-slate-500 mt-1">{cues.length} 段字幕片段</p>
                  </div>
                  <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-2">
                    {cues.length === 0 ? (
                       <div className="flex items-center justify-center h-full text-slate-500 italic p-4 text-center">
                          無內容。
                       </div>
                    ) : (
                      cues.map((cue, idx) => (
                        <div key={idx} className="p-3 rounded-lg hover:bg-slate-700/50 transition-colors group border border-transparent hover:border-slate-600">
                          <div className="flex justify-between text-xs text-slate-500 mb-1 font-mono">
                            <span>{new Date(cue.startTime * 1000).toISOString().substr(11, 8)}</span>
                            <span>#{cue.id}</span>
                          </div>
                          <div className="text-slate-300 text-sm leading-relaxed whitespace-pre-line">
                            {cue.text}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
               </div>
            </div>
          </div>
        )}

      </main>
    </div>
  );
};

export default App;