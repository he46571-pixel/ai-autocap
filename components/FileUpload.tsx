import React, { useRef, useState } from 'react';
import { Upload, FileVideo, AlertCircle } from 'lucide-react';

interface FileUploadProps {
  onFileSelect: (file: File) => void;
  disabled?: boolean;
}

const FileUpload: React.FC<FileUploadProps> = ({ onFileSelect, disabled }) => {
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (!disabled) setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (disabled) return;

    const files = e.dataTransfer.files;
    validateAndPass(files[0]);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      validateAndPass(e.target.files[0]);
    }
  };

  const validateAndPass = (file: File) => {
    setError(null);
    // Check for common video mime types or extensions
    const validTypes = ['video/mp4', 'video/x-matroska', 'video/webm', 'video/quicktime', 'video/mpeg'];
    // MKV often has empty mime type in some browsers or video/x-matroska
    const isMkv = file.name.toLowerCase().endsWith('.mkv');
    
    if (!validTypes.includes(file.type) && !isMkv) {
      setError("不支援的檔案格式。請上傳 MP4、MKV、MOV 或 WebM。");
      return;
    }

    onFileSelect(file);
  };

  return (
    <div className="w-full max-w-2xl mx-auto">
      <div
        onClick={() => !disabled && inputRef.current?.click()}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`
          relative group cursor-pointer
          border-2 border-dashed rounded-2xl p-12
          transition-all duration-300 ease-in-out
          flex flex-col items-center justify-center text-center
          ${disabled ? 'opacity-50 cursor-not-allowed border-slate-700 bg-slate-800/50' : 
            isDragging 
              ? 'border-indigo-400 bg-indigo-500/10 scale-[1.01]' 
              : 'border-slate-700 hover:border-indigo-500/50 hover:bg-slate-800/50 bg-slate-800/30'
          }
        `}
      >
        <input
          type="file"
          ref={inputRef}
          onChange={handleInputChange}
          className="hidden"
          accept=".mp4,.mkv,.mov,.webm"
          disabled={disabled}
        />

        <div className={`p-4 rounded-full mb-4 transition-colors ${isDragging ? 'bg-indigo-500/20' : 'bg-slate-700/50 group-hover:bg-indigo-500/20'}`}>
          {isDragging ? (
            <FileVideo className="w-10 h-10 text-indigo-400" />
          ) : (
            <Upload className="w-10 h-10 text-slate-400 group-hover:text-indigo-400" />
          )}
        </div>

        <h3 className="text-xl font-semibold text-slate-200 mb-2">
          {isDragging ? '放開以開始上傳' : '上傳影片'}
        </h3>
        <p className="text-slate-400 text-sm max-w-xs">
          拖放檔案或點擊瀏覽。支援 MP4、MKV、MOV。無檔案大小限制（用戶端處理）。
        </p>

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

export default FileUpload;