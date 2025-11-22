import { GoogleGenAI } from "@google/genai";

const MODEL_NAME = 'gemini-2.5-flash';

export const generateSubtitles = async (
  base64Data: string, 
  mimeType: string
): Promise<string> => {
  if (!process.env.API_KEY) {
    throw new Error("環境變數中缺少 API Key");
  }

  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  const prompt = `
    You are a professional video subtitle generator and translator.
    Analyze the audio in the provided video file and generate subtitles.
    
    STRICT OUTPUT REQUIREMENTS:
    1. Output MUST be in valid SubRip (SRT) format.
    2. Do NOT include any Markdown formatting (no \`\`\`srt or \`\`\`).
    3. Do NOT include any introductory or concluding text.
    4. Ensure timestamps are accurate to the audio.
    5. If there is no speech, return an empty string.
    
    LANGUAGE & TRANSLATION RULES:
    1. Detect the spoken language automatically.
    2. **If the audio is in Chinese (Mandarin/Cantonese):**
       - Transcribe directly into **Traditional Chinese (繁體中文)**.
       - Output only one line of text per subtitle block.
    3. **If the audio is in English (or other languages):**
       - Provide the **Original English text** on the first line.
       - Provide the **Traditional Chinese (繁體中文) translation** on the second line.
       - Format:
         Original English Text
         翻譯後的繁體中文
    
    Example format (English Source):
    1
    00:00:01,000 --> 00:00:04,000
    Hello, welcome to the video.
    哈囉，歡迎來到這部影片。

    2
    00:00:04,500 --> 00:00:06,000
    This is an example.
    這是一個範例。
    
    Example format (Chinese Source):
    1
    00:00:01,000 --> 00:00:04,000
    大家好，歡迎收看。
  `;

  try {
    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: mimeType,
              data: base64Data
            }
          },
          {
            text: prompt
          }
        ]
      },
      config: {
        temperature: 0.2, 
      }
    });

    const text = response.text;
    if (!text) {
      throw new Error("Gemini 無法生成文字內容。");
    }
    
    return text.replace(/^```srt\n?/, '').replace(/^```\n?/, '').replace(/```$/, '').trim();

  } catch (error) {
    console.error("Gemini API Error:", error);
    throw error;
  }
};