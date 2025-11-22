import { VideoData } from '../types';

/**
 * Fetches a YouTube video using the Cobalt API (a privacy-focused media downloader).
 * Returns a File object that can be processed exactly like a local upload.
 */
export const fetchYouTubeVideo = async (
  url: string, 
  onProgress: (msg: string) => void
): Promise<File> => {
  try {
    onProgress("正在解析 YouTube 影片資訊...");

    // Use a public Cobalt instance. In production, you should host your own.
    // API Docs: https://github.com/imputnet/cobalt/blob/master/docs/api.md
    const apiEndpoint = 'https://api.cobalt.tools/api/json';
    
    const response = await fetch(apiEndpoint, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        url: url,
        vCodec: 'h264', // Ensure compatibility
        vQuality: '720', // Balance quality and processing speed
        aFormat: 'mp3',
        isAudioOnly: false
      })
    });

    const data = await response.json();

    if (!response.ok || (data.status && data.status === 'error')) {
      throw new Error(data.text || "無法解析 YouTube 影片，請確認連結是否公開。");
    }

    // Depending on the instance config, it might return a 'url' (stream) or 'picker'
    const streamUrl = data.url;
    
    if (!streamUrl) {
      throw new Error("找不到影片串流來源。");
    }

    onProgress("正在下載影片至瀏覽器記憶體 (此步驟取決於網速)...");

    // Fetch the actual video data as a Blob
    const videoRes = await fetch(streamUrl);
    if (!videoRes.ok) throw new Error("影片下載失敗。");

    const blob = await videoRes.blob();

    // Create a File object from the Blob
    const filename = "youtube_video.mp4";
    const file = new File([blob], filename, { type: 'video/mp4' });

    return file;

  } catch (error: any) {
    console.error("YouTube Fetch Error:", error);
    throw new Error(error.message || "擷取 YouTube 影片時發生錯誤");
  }
};