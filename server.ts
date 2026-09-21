import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Modality } from "@google/genai";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: "15mb" }));

  // In-memory audio synthesis cache to prevent quota exhaustion on repeated previews
  const audioCache = new Map<string, { audioData: string; mimeType: string; modelUsed: string }>();
  let quotaCooldownUntil = 0;

  // Health check endpoint
  app.get("/api/health", (req, res) => {
    res.json({
      status: "ok",
      hasServerKey: Boolean(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.trim().length > 0),
      isQuotaCooldown: Date.now() < quotaCooldownUntil,
    });
  });

  // Speech synthesis endpoint
  app.post("/api/synthesize", async (req, res) => {
    try {
      const { text, voiceName, personaName, gender, styleInstruction, emotionPrompt, apiKey } = req.body;

      if (!text || typeof text !== "string" || !text.trim()) {
        return res.status(400).json({ error: "Naskah teks tidak boleh kosong." });
      }

      const activeApiKey = (apiKey && typeof apiKey === "string" && apiKey.trim().length > 0)
        ? apiKey.trim()
        : process.env.GEMINI_API_KEY;

      if (!activeApiKey) {
        return res.status(400).json({
          error: "Gemini API Key belum disetel. Silakan masukkan API Key di menu pengaturan atau pastikan GEMINI_API_KEY tersedia di server.",
        });
      }

      const cleanText = text.trim();
      const targetVoice = (voiceName && ["Kore", "Aoede", "Charon", "Puck", "Fenrir"].includes(voiceName))
        ? voiceName
        : "Kore";

      // Check cache first
      const cacheKey = `${targetVoice}_${personaName || ''}_${emotionPrompt || ''}_${cleanText}`;
      if (audioCache.has(cacheKey)) {
        const cached = audioCache.get(cacheKey)!;
        return res.json({
          success: true,
          ...cached,
          cached: true,
        });
      }

      // If in cooldown from free tier limit, gracefully inform client to use browser voice engine
      if (Date.now() < quotaCooldownUntil && !apiKey) {
        return res.json({
          success: false,
          quotaExceeded: true,
          message: "Batas kuota harian Gemini AI (3.1 Flash TTS) telah tercapai. Sistem otomatis beralih ke Mode Suara Karakter Browser.",
        });
      }

      // Official Google Gemini TTS prompt format with #### TRANSCRIPT delimiter
      const prompt = `Synthesize speech for the performance defined below. The profile, scene, performance notes, and context are direction only. Do NOT speak them.

# AUDIO PROFILE
Speaker: ${personaName || targetVoice} (${gender || "Indonesian speaker"})
Vocal Characteristics: ${styleInstruction || "Clear articulate Indonesian speech"}

### DIRECTOR'S NOTES
Emotion and Mood: ${emotionPrompt || "Natural, clear, and expressive"}
Language: Indonesian (Bahasa Indonesia)
Pronunciation: Pronounce Indonesian vowels (A, I, U, E, O) and consonants cleanly with natural human cadence, organic breathing pauses, and authentic prosody. No robotic artifacts.

#### TRANSCRIPT
${cleanText}`;

      // 1. Primary TTS generation: gemini-3.1-flash-tts-preview
      try {
        const ai = new GoogleGenAI({
          apiKey: activeApiKey,
          httpOptions: {
            headers: {
              "User-Agent": "aistudio-build",
            },
          },
        });

        const response = await ai.models.generateContent({
          model: "gemini-3.1-flash-tts-preview",
          contents: [{ parts: [{ text: prompt }] }],
          config: {
            responseModalities: [Modality.AUDIO],
            speechConfig: {
              voiceConfig: {
                prebuiltVoiceConfig: { voiceName: targetVoice },
              },
            },
          },
        });

        const part = response.candidates?.[0]?.content?.parts?.[0];
        const audioData = part?.inlineData?.data;
        const mimeType = part?.inlineData?.mimeType || "audio/pcm;rate=24000";

        if (audioData) {
          const result = {
            audioData,
            mimeType,
            modelUsed: "gemini-3.1-flash-tts-preview",
          };

          // Save to cache (limit size to 100 entries)
          if (audioCache.size > 100) {
            const firstKey = audioCache.keys().next().value;
            if (firstKey) audioCache.delete(firstKey);
          }
          audioCache.set(cacheKey, result);

          return res.json({
            success: true,
            ...result,
          });
        }
      } catch (sdkError: any) {
        const errMsg = sdkError?.message || String(sdkError);

        // Check for 429 rate limit or quota exceeded
        if (errMsg.includes("429") || errMsg.includes("RESOURCE_EXHAUSTED") || errMsg.includes("quota")) {
          quotaCooldownUntil = Date.now() + 60 * 1000; // 60 seconds cooldown
          return res.json({
            success: false,
            quotaExceeded: true,
            message: "Batas kuota gratis Gemini AI (3.1 Flash TTS) telah tercapai. Sistem otomatis beralih ke Mode Suara Browser Pintar dengan artikulasi khas tiap karakter.",
          });
        }
      }

      return res.json({
        success: false,
        error: "Gagal menggenerasi audio dari Gemini AI. Mengalihkan ke Mode Suara Karakter Browser.",
      });
    } catch (err: any) {
      return res.json({
        success: false,
        error: err?.message || "Terjadi kendala pada pemrosesan audio.",
      });
    }
  });

  // Vite integration for development and production static serve
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
