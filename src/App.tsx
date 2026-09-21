import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Play,
  Square,
  Download,
  Volume2,
  Sparkles,
  Music,
  History,
  FileText,
  Copy,
  Check,
  RotateCcw,
  Mic,
  Clock,
  Trash2,
  Subtitles,
  Plus,
  Radio,
  Wand2,
  UserCheck,
  AudioWaveform,
  Zap,
  Loader2,
  Cpu,
  Smile,
  Key,
  AlertCircle,
  X,
  VolumeX,
  Sliders,
  CheckCircle2
} from 'lucide-react';
import {
  GEMINI_VOICE_PERSONAS,
  EMOTION_STYLES,
  SCRIPT_TEMPLATES,
  BGM_TRACKS
} from './data/voices';
import {
  base64ToArrayBuffer,
  pcmToWav,
  processAudioSpeed,
  processAudioEnhancements,
  generateSrtContent,
  synthesizeOfflineVoiceWav
} from './utils/audio';
import { Persona, EmotionStyle, HistoryItem, ToastNotification } from './types';

export default function App() {
  const [text, setText] = useState<string>(
    'Halo! Selamat datang di TextVoice Studio Pro. Sekarang suaraku sudah ditenagai oleh kecerdasan buatan Gemini AI dengan artikulasi vokal dan konsonan yang sangat jernih, fasih, dan terdengar alami seperti manusia asli!'
  );
  const [engineMode, setEngineMode] = useState<'gemini' | 'browser'>('gemini');
  const [geminiQuotaExhausted, setGeminiQuotaExhausted] = useState<boolean>(false);
  const [selectedPersonaId, setSelectedPersonaId] = useState<string>('dian-studio');
  const [selectedEmotion, setSelectedEmotion] = useState<string>('clear-articulation');
  const [personaCategoryFilter, setPersonaCategoryFilter] = useState<'semua' | 'jernih' | 'kasual' | 'formal' | 'ekspresif'>('semua');
  const [speed, setSpeed] = useState<number>(1.0);
  const [pitch, setPitch] = useState<number>(1.0);
  const [selectedBgm, setSelectedBgm] = useState<string>('none');
  const [bgmVolume, setBgmVolume] = useState<number>(0.2);

  // Gemini API Key State & Server detection
  const [customApiKey, setCustomApiKey] = useState<string>('');
  const [hasServerKey, setHasServerKey] = useState<boolean>(false);
  const [showKeyModal, setShowKeyModal] = useState<boolean>(false);

  // UI & Playback States
  const [isLoadingAi, setIsLoadingAi] = useState<boolean>(false);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [generatedAudioUrl, setGeneratedAudioUrl] = useState<string | null>(null);
  const [lastWavBlob, setLastWavBlob] = useState<Blob | null>(null);
  const [lastGeneratedPersonaId, setLastGeneratedPersonaId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'editor' | 'templates' | 'bgm' | 'history'>('editor');
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [toast, setToast] = useState<ToastNotification | null>(null);
  const [copiedText, setCopiedText] = useState<boolean>(false);

  // System voices fallback for browser mode
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedVoiceURI, setSelectedVoiceURI] = useState<string>('');

  // Audio Context & Animation Refs
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const bgmAudioContextRef = useRef<AudioContext | null>(null);
  const bgmOscillatorsRef = useRef<OscillatorNode[]>([]);
  const bgmIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const showToast = useCallback((message: string, type: ToastNotification['type'] = 'info') => {
    setToast({ message, type });
    const timer = setTimeout(() => {
      setToast(null);
    }, 4000);
    return () => clearTimeout(timer);
  }, []);

  // Check health and server API key status
  useEffect(() => {
    const savedKey = localStorage.getItem('gemini_api_key');
    if (savedKey) setCustomApiKey(savedKey);

    fetch('/api/health')
      .then((res) => res.json())
      .then((data) => {
        if (data && data.hasServerKey) {
          setHasServerKey(true);
        }
        if (data && data.isQuotaCooldown) {
          setGeminiQuotaExhausted(true);
          setEngineMode('browser');
        }
      })
      .catch(() => {
        // Dev server might be starting
      });

    const loadVoices = () => {
      if (typeof window === 'undefined' || !window.speechSynthesis) return;
      const availVoices = window.speechSynthesis.getVoices();
      if (availVoices && availVoices.length > 0) {
        setVoices(availVoices);
        // Default to Indonesian voice if available
        const idVoice = availVoices.find((v) => v.lang.includes('id') || v.lang.includes('ID'));
        if (idVoice) {
          setSelectedVoiceURI(idVoice.voiceURI);
        }
      }
    };

    loadVoices();
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.onvoiceschanged = loadVoices;
    }

    try {
      const savedHistory = localStorage.getItem('textvoice_history');
      if (savedHistory) setHistory(JSON.parse(savedHistory));
    } catch (e) {
      console.error(e);
    }
  }, []);

  const saveApiKey = (key: string) => {
    const trimmed = key.trim();
    setCustomApiKey(trimmed);
    if (trimmed) {
      localStorage.setItem('gemini_api_key', trimmed);
    } else {
      localStorage.removeItem('gemini_api_key');
    }
    setShowKeyModal(false);
    showToast(trimmed ? 'API Key berhasil disimpan!' : 'API Key dihapus, menggunakan default server.', 'success');
  };

  const saveToHistory = useCallback((scriptText: string, voiceName: string) => {
    const newItem: HistoryItem = {
      id: Date.now(),
      text: scriptText,
      voice: voiceName,
      date: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setHistory((prev) => {
      const updated = [newItem, ...prev.slice(0, 19)];
      try {
        localStorage.setItem('textvoice_history', JSON.stringify(updated));
      } catch (e) {
        console.error(e);
      }
      return updated;
    });
  }, []);

  const generateGeminiAudio = async (
    textToSpeak: string,
    persona: Persona,
    emotionPrompt: string,
    speedRate = 1.0
  ): Promise<{ audioUrl: string | null; wavBlob: Blob | null; quotaExceeded?: boolean } | null> => {
    setIsLoadingAi(true);
    showToast(`Menghubungkan ke Gemini AI untuk suara ${persona.name}...`, 'info');

    try {
      const response = await fetch('/api/synthesize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: textToSpeak,
          voiceName: persona.voiceName,
          personaName: persona.name,
          gender: persona.gender,
          styleInstruction: persona.styleInstruction,
          emotionPrompt: emotionPrompt,
          apiKey: customApiKey || undefined,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP Error ${response.status}`);
      }

      const result = await response.json();

      if (result.quotaExceeded) {
        setGeminiQuotaExhausted(true);
        setEngineMode('browser');
        setIsLoadingAi(false);
        return { quotaExceeded: true, audioUrl: null, wavBlob: null };
      }

      if (!result.success && result.error) {
        throw new Error(result.error);
      }

      const audioData = result?.audioData;
      const mimeType = result?.mimeType || 'audio/pcm;rate=24000';

      if (!audioData) {
        throw new Error('Format respon audio dari AI tidak valid atau kosong.');
      }

      const sampleRateMatch = mimeType.match(/rate=(\d+)/);
      const sampleRate = sampleRateMatch ? parseInt(sampleRateMatch[1], 10) : 24000;

      const pcmBuffer = base64ToArrayBuffer(audioData);
      let pcm16 = new Int16Array(pcmBuffer);

      // Apply persona-specific acoustic shaping (pitch shift, equalized presence, speed factor)
      const effectiveSpeed = speedRate * (persona.speedRate || 1.0);
      pcm16 = await processAudioEnhancements(
        pcm16,
        effectiveSpeed,
        persona.pitchShift || 0,
        persona.id,
        sampleRate
      );

      const wavBlob = pcmToWav(pcm16, sampleRate, 1);
      const audioUrl = URL.createObjectURL(wavBlob);

      setLastWavBlob(wavBlob);
      setLastGeneratedPersonaId(persona.id);
      setGeneratedAudioUrl(audioUrl);
      setIsLoadingAi(false);
      return { quotaExceeded: false, audioUrl, wavBlob };
    } catch (error: any) {
      setIsLoadingAi(false);
      let errMsg = error?.message || 'Gagal memproses audio';
      if (errMsg.includes('API key belum disetel') || errMsg.includes('API Key belum')) {
        setShowKeyModal(true);
      }
      showToast(errMsg, 'info');
      return null;
    }
  };

  const startBGM = useCallback(() => {
    if (selectedBgm === 'none') return;
    try {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const ctx = new AudioCtx();
      bgmAudioContextRef.current = ctx;

      const masterGain = ctx.createGain();
      masterGain.gain.value = bgmVolume;
      masterGain.connect(ctx.destination);

      if (selectedBgm === 'lofi') {
        const freqs = [261.63, 329.63, 392.0, 493.88];
        freqs.forEach((freq) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, ctx.currentTime);
          gain.gain.setValueAtTime(0.06 / freqs.length, ctx.currentTime);
          osc.connect(gain);
          gain.connect(masterGain);
          osc.start();
          bgmOscillatorsRef.current.push(osc);
        });
      } else if (selectedBgm === 'energetic') {
        const notes = [220, 277.18, 329.63, 440];
        let noteIndex = 0;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        gain.gain.value = 0.04;

        bgmIntervalRef.current = setInterval(() => {
          if (ctx.state === 'closed') {
            if (bgmIntervalRef.current) clearInterval(bgmIntervalRef.current);
            return;
          }
          osc.frequency.setValueAtTime(notes[noteIndex % notes.length], ctx.currentTime);
          noteIndex++;
        }, 220);

        osc.connect(gain);
        gain.connect(masterGain);
        osc.start();
        bgmOscillatorsRef.current.push(osc);
      } else if (selectedBgm === 'cinematic') {
        [110, 164.81, 220].forEach((freq) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sawtooth';
          osc.frequency.setValueAtTime(freq, ctx.currentTime);
          gain.gain.setValueAtTime(0.025, ctx.currentTime);
          osc.connect(gain);
          gain.connect(masterGain);
          osc.start();
          bgmOscillatorsRef.current.push(osc);
        });
      }
    } catch (e) {
      console.warn(e);
    }
  }, [selectedBgm, bgmVolume]);

  const stopBGM = useCallback(() => {
    if (bgmIntervalRef.current) {
      clearInterval(bgmIntervalRef.current);
      bgmIntervalRef.current = null;
    }
    bgmOscillatorsRef.current.forEach((osc) => {
      try {
        osc.stop();
        osc.disconnect();
      } catch {
        // ignore already stopped
      }
    });
    bgmOscillatorsRef.current = [];

    if (bgmAudioContextRef.current) {
      try {
        bgmAudioContextRef.current.close();
      } catch {
        // ignore
      }
      bgmAudioContextRef.current = null;
    }
  }, []);

  const startVisualizer = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    let phase = 0;

    const render = () => {
      if (!canvas) return;
      const width = canvas.width;
      const height = canvas.height;
      ctx.clearRect(0, 0, width, height);

      const barCount = 36;
      const barWidth = width / barCount - 3;

      for (let i = 0; i < barCount; i++) {
        const sinVal = Math.sin(phase + i * 0.25);
        const cosVal = Math.cos(phase * 1.4 + i * 0.15);
        const amp = Math.abs(sinVal * cosVal * 0.85) + 0.15;
        const barHeight = amp * (height * 0.85);

        const x = i * (barWidth + 3);
        const y = (height - barHeight) / 2;

        const gradient = ctx.createLinearGradient(0, y, 0, y + barHeight);
        gradient.addColorStop(0, '#c084fc');
        gradient.addColorStop(0.5, '#60a5fa');
        gradient.addColorStop(1, '#38bdf8');

        ctx.fillStyle = gradient;
        ctx.beginPath();
        if ('roundRect' in ctx) {
          (ctx as any).roundRect(x, y, barWidth, barHeight, 4);
        } else {
          ctx.rect(x, y, barWidth, barHeight);
        }
        ctx.fill();
      }

      phase += 0.14;
      animFrameRef.current = requestAnimationFrame(render);
    };

    render();
  }, []);

  const stopVisualizer = useCallback(() => {
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
  }, []);

  const handleStop = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    stopBGM();
    stopVisualizer();
    setIsPlaying(false);
  }, [stopBGM, stopVisualizer]);

  const speakWithBrowser = useCallback(
    (textToSpeak: string, persona: Persona) => {
      if (typeof window === 'undefined' || !window.speechSynthesis) {
        showToast('Browser Anda tidak mendukung Speech Synthesis!', 'error');
        return;
      }

      window.speechSynthesis.cancel();
      setIsPlaying(true);
      startBGM();
      startVisualizer();

      const utterance = new SpeechSynthesisUtterance(textToSpeak);

      // Pick best matching voice for this persona
      const idVoices = voices.filter((v) => v.lang.toLowerCase().includes('id'));
      let matchedVoice: SpeechSynthesisVoice | undefined;

      if (idVoices.length > 0) {
        if (persona.gender === 'Pria') {
          matchedVoice =
            idVoices.find((v) => {
              const n = v.name.toLowerCase();
              return n.includes('male') || n.includes('pria') || n.includes('ardi') || n.includes('david');
            }) || idVoices[0];
        } else {
          matchedVoice =
            idVoices.find((v) => {
              const n = v.name.toLowerCase();
              return n.includes('female') || n.includes('wanita') || n.includes('gadis') || n.includes('siti');
            }) || idVoices[0];
        }
      } else {
        matchedVoice = voices.find((v) => v.voiceURI === selectedVoiceURI) || voices[0];
      }

      if (matchedVoice) utterance.voice = matchedVoice;
      utterance.lang = 'id-ID';

      // Tailored pitch and rate specific to each persona so every single character sounds distinctly unique
      utterance.pitch = Math.max(0.5, Math.min(2.0, persona.browserPitch * pitch));
      utterance.rate = Math.max(0.5, Math.min(2.0, persona.browserRate * speed));

      utterance.onend = () => {
        setIsPlaying(false);
        stopBGM();
        stopVisualizer();
        saveToHistory(textToSpeak, `${persona.name} (Suara Browser)`);
      };

      utterance.onerror = () => {
        setIsPlaying(false);
        stopBGM();
        stopVisualizer();
      };

      window.speechSynthesis.speak(utterance);
    },
    [voices, selectedVoiceURI, pitch, speed, startBGM, startVisualizer, stopBGM, stopVisualizer, saveToHistory, showToast]
  );

  const handleSpeak = async () => {
    if (!text.trim()) {
      showToast('Ketik atau tempel teks naskah terlebih dahulu!', 'warning');
      return;
    }

    if (isPlaying) {
      handleStop();
      return;
    }

    const activePersona =
      GEMINI_VOICE_PERSONAS.find((p) => p.id === selectedPersonaId) || GEMINI_VOICE_PERSONAS[0];
    const activeEmotion =
      EMOTION_STYLES.find((e) => e.id === selectedEmotion) || EMOTION_STYLES[0];

    if (engineMode === 'gemini') {
      try {
        const res = await generateGeminiAudio(text, activePersona, activeEmotion.prompt, speed);
        if (!res) return;

        if (audioRef.current) {
          audioRef.current.pause();
          audioRef.current.src = res.audioUrl;
          audioRef.current.load(); // Force HTML5 Audio element to re-read and flush decode cache
          audioRef.current.playbackRate = 1.0;
          audioRef.current.onended = () => {
            setIsPlaying(false);
            stopBGM();
            stopVisualizer();
            saveToHistory(text, `${activePersona.name} (Gemini AI)`);
          };

          await audioRef.current.play();
          setIsPlaying(true);
          startBGM();
          startVisualizer();
        }
      } catch (err: any) {
        showToast(
          `Memutar otomatis dengan Suara Karakter Browser (${activePersona.name})!`,
          'info'
        );
        speakWithBrowser(text, activePersona);
      }
    } else {
      speakWithBrowser(text, activePersona);
    }
  };

  const handleDownload = async () => {
    if (!text.trim()) {
      showToast('Masukkan naskah terlebih dahulu!', 'warning');
      return;
    }

    const activePersona =
      GEMINI_VOICE_PERSONAS.find((p) => p.id === selectedPersonaId) || GEMINI_VOICE_PERSONAS[0];
    const activeEmotion =
      EMOTION_STYLES.find((e) => e.id === selectedEmotion) || EMOTION_STYLES[0];

    try {
      // If we already have the latest blob from playback for the selected persona, download directly
      let blobToDownload = (lastGeneratedPersonaId === activePersona.id) ? lastWavBlob : null;

      if (!blobToDownload && engineMode === 'gemini' && !geminiQuotaExhausted) {
        const res = await generateGeminiAudio(text, activePersona, activeEmotion.prompt, speed);
        if (res && res.wavBlob) {
          blobToDownload = res.wavBlob;
        }
      }

      // If in browser mode or Gemini quota reached, synthesize offline speech WAV instantly!
      if (!blobToDownload) {
        showToast(`Menghasilkan file audio WAV untuk karakter ${activePersona.name}...`, 'info');
        blobToDownload = await synthesizeOfflineVoiceWav(text, activePersona, speed, pitch);
        setLastWavBlob(blobToDownload);
        setLastGeneratedPersonaId(activePersona.id);
      }

      if (blobToDownload) {
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blobToDownload);
        link.download = `TextVoice-${activePersona.id}-${speed}x-${Date.now()}.wav`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        showToast(`File Audio (.WAV) ${activePersona.name} berhasil diunduh!`, 'success');
      }
    } catch (err: any) {
      showToast('Gagal mengunduh audio: ' + (err?.message || 'Terjadi kesalahan'), 'error');
    }
  };

  const exportSRT = () => {
    if (!text.trim()) {
      showToast('Masukkan teks naskah terlebih dahulu!', 'warning');
      return;
    }

    const srtContent = generateSrtContent(text, speed);
    if (!srtContent) {
      showToast('Teks terlalu pendek untuk membuat subtitle.', 'warning');
      return;
    }

    const blob = new Blob([srtContent], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `subtitle-${Date.now()}.srt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    showToast('File Subtitle (.SRT) berhasil diexport!', 'success');
  };

  const clearHistory = () => {
    setHistory([]);
    try {
      localStorage.removeItem('textvoice_history');
    } catch (e) {
      console.error(e);
    }
    showToast('Riwayat berhasil dibersihkan', 'info');
  };

  const activePersona =
    GEMINI_VOICE_PERSONAS.find((p) => p.id === selectedPersonaId) || GEMINI_VOICE_PERSONAS[0];

  const wordCount = text.trim() ? text.trim().split(/\s+/).length : 0;
  const estimatedSeconds = Math.ceil((wordCount / (150 * speed)) * 60);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-purple-500 selection:text-white pb-14">
      <audio ref={audioRef} className="hidden" />

      {/* Toast Notification */}
      {toast && (
        <div
          className={`fixed top-5 right-5 z-50 flex items-center gap-3 px-5 py-3.5 rounded-2xl border shadow-2xl text-sm font-semibold transition-all max-w-md ${
            toast.type === 'error'
              ? 'bg-rose-950/90 border-rose-800 text-rose-200'
              : toast.type === 'warning'
              ? 'bg-amber-950/90 border-amber-800 text-amber-200'
              : toast.type === 'success'
              ? 'bg-emerald-950/90 border-emerald-800 text-emerald-200'
              : 'bg-slate-900/95 border-purple-500/40 text-purple-200'
          }`}
        >
          {toast.type === 'error' ? (
            <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
          ) : toast.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          ) : (
            <Sparkles className="w-5 h-5 text-purple-400 shrink-0" />
          )}
          <span className="leading-snug">{toast.message}</span>
        </div>
      )}

      {/* API Key Modal */}
      {showKeyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-lg flex items-center gap-2 text-slate-100">
                <Key className="w-5 h-5 text-purple-400" /> Pengaturan Gemini API Key
              </h3>
              <button
                onClick={() => setShowKeyModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              {hasServerKey
                ? 'Server aplikasi Anda telah terhubung secara otomatis dengan Gemini API Key! Jika ingin menggunakan kunci khusus milik Anda sendiri, silakan masukkan di bawah.'
                : 'Aplikasi menggunakan Gemini AI untuk sintesis suara Bahasa Indonesia. Masukkan Gemini API Key Anda dari Google AI Studio.'}
            </p>
            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">
                Kunci API Gemini
              </label>
              <input
                type="password"
                placeholder={hasServerKey ? 'Default server terpasang (opsional)' : 'AIzaSy...'}
                defaultValue={customApiKey}
                id="apiKeyInput"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-sm focus:border-purple-500 focus:outline-none text-slate-200"
              />
            </div>
            <div className="flex gap-2 justify-end pt-2">
              <button
                onClick={() => setShowKeyModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-slate-200"
              >
                Batal
              </button>
              <button
                onClick={() => {
                  const inputVal = (document.getElementById('apiKeyInput') as HTMLInputElement)
                    ?.value;
                  saveApiKey(inputVal || '');
                }}
                className="px-5 py-2 rounded-xl text-xs font-bold bg-purple-600 hover:bg-purple-500 text-white shadow-lg transition"
              >
                Simpan
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <header className="border-b border-slate-800/80 bg-slate-900/70 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-purple-600 via-blue-500 to-cyan-400 p-0.5 shadow-lg shadow-purple-500/20">
              <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center">
                <Radio className="w-5 h-5 text-purple-400 animate-pulse" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-black tracking-tight bg-gradient-to-r from-white via-slate-200 to-purple-300 bg-clip-text text-transparent">
                  TextVoice
                </h1>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-500/20 border border-purple-500/40 text-purple-300 font-mono font-bold">
                  PRO
                </span>
              </div>
              <p className="text-[11px] text-slate-400 -mt-0.5 font-medium hidden sm:block">
                AI Indonesian Voiceover & Speech Studio
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            {/* API Key Status Indicator */}
            <button
              onClick={() => setShowKeyModal(true)}
              className="p-2 sm:px-3 sm:py-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white transition flex items-center gap-1.5 text-xs font-semibold border border-slate-700/50"
              title="Pengaturan Kunci API"
            >
              <Key className="w-4 h-4 text-purple-400" />
              <span className="hidden md:inline">
                {customApiKey ? 'Key Kustom Aktif' : hasServerKey ? 'AI Siap Digunakan' : 'Atur API Key'}
              </span>
            </button>

            {/* Main Tabs */}
            <nav className="flex items-center gap-1 bg-slate-900 p-1 rounded-xl border border-slate-800">
              <button
                onClick={() => setActiveTab('editor')}
                className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  activeTab === 'editor'
                    ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                }`}
              >
                <Mic className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Studio</span>
              </button>
              <button
                onClick={() => setActiveTab('templates')}
                className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  activeTab === 'templates'
                    ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                }`}
              >
                <FileText className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Naskah</span>
              </button>
              <button
                onClick={() => setActiveTab('bgm')}
                className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  activeTab === 'bgm'
                    ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                }`}
              >
                <Music className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Musik</span>
              </button>
              <button
                onClick={() => setActiveTab('history')}
                className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  activeTab === 'history'
                    ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                }`}
              >
                <History className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Riwayat</span>
              </button>
            </nav>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 sm:pt-8">
        {activeTab === 'editor' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-8">
            {/* Left Column: Engine Switcher, Persona Grid, and Script Editor */}
            <div className="lg:col-span-7 flex flex-col gap-6">
              {/* Engine Mode Switcher */}
              <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-3 flex flex-wrap items-center justify-between gap-3 shadow-xl">
                <div className="flex items-center gap-2 px-2">
                  <Cpu className="w-4 h-4 text-purple-400" />
                  <span className="text-xs font-bold text-slate-200">Audio Engine:</span>
                </div>

                <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
                  <button
                    onClick={() => {
                      setEngineMode('gemini');
                      setGeminiQuotaExhausted(false);
                    }}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                      engineMode === 'gemini'
                        ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white shadow-md'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <Sparkles className="w-3.5 h-3.5 text-yellow-300" />
                    <span>Gemini AI (Fasih ID)</span>
                  </button>
                  <button
                    onClick={() => setEngineMode('browser')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                      engineMode === 'browser'
                        ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white shadow-md'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <AudioWaveform className="w-3.5 h-3.5" />
                    <span>Browser System</span>
                  </button>
                </div>
              </div>

              {geminiQuotaExhausted && (
                <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-500/10 via-purple-500/10 to-indigo-500/10 border border-amber-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-lg">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-xl bg-amber-500/20 text-amber-300 shrink-0">
                      <AlertCircle className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-amber-200 flex items-center gap-1.5">
                        Mode Suara Karakter Browser Aktif (Tanpa Batas Kuota)
                      </h4>
                      <p className="text-[11px] text-slate-300 mt-0.5 leading-relaxed">
                        Kuota harian gratis Gemini AI TTS telah tercapai. Anda tetap dapat mendengarkan seluruh karakter dengan modulasi artikulasi & nada khas, serta mengunduh audio WAV sepuasnya.
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setGeminiQuotaExhausted(false);
                      setEngineMode('gemini');
                      showToast('Mencoba menyambungkan kembali ke Gemini AI...', 'info');
                    }}
                    className="px-3 py-1.5 rounded-xl bg-amber-500/25 hover:bg-amber-500/40 text-amber-200 border border-amber-500/40 text-xs font-bold transition whitespace-nowrap self-end sm:self-auto"
                  >
                    Coba Gemini AI
                  </button>
                </div>
              )}

              {/* Persona Selector Grid */}
              <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-5 sm:p-6 shadow-2xl backdrop-blur-xl">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
                  <div>
                    <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
                      <UserCheck className="w-5 h-5 text-purple-400" />
                      Karakter Suara Bahasa Indonesia
                    </h2>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Artikulasi jernih, intonasi bernapas, dan lafal alami tanpa aksen robotik AI.
                    </p>
                  </div>
                  <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 self-start sm:self-auto flex items-center gap-1.5">
                    <Sparkles className="w-3 h-3 text-emerald-400" />
                    Ultra HD Articulation
                  </span>
                </div>

                {/* Category Filter Tabs */}
                <div className="flex items-center gap-1.5 overflow-x-auto pb-2 mb-3 scrollbar-none">
                  {[
                    { id: 'semua', label: 'Semua Suara' },
                    { id: 'jernih', label: '🎙️ Artikulasi Jernih HD' },
                    { id: 'kasual', label: '☕ Natural & Kasual' },
                    { id: 'formal', label: '💼 Formal & Berita' },
                    { id: 'ekspresif', label: '🎬 Ekspresif' }
                  ].map((cat) => (
                    <button
                      key={cat.id}
                      onClick={() => setPersonaCategoryFilter(cat.id as any)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                        personaCategoryFilter === cat.id
                          ? 'bg-purple-600 text-white shadow-md shadow-purple-600/30'
                          : 'bg-slate-950/70 text-slate-400 hover:text-slate-200 hover:bg-slate-800 border border-slate-800/80'
                      }`}
                    >
                      {cat.label}
                    </button>
                  ))}
                </div>

                {/* Persona Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[300px] overflow-y-auto pr-1">
                  {GEMINI_VOICE_PERSONAS.filter(
                    (p) => personaCategoryFilter === 'semua' || p.category === personaCategoryFilter
                  ).map((persona) => {
                    const isSelected = selectedPersonaId === persona.id;

                    return (
                      <div
                        key={persona.id}
                        onClick={() => {
                          if (isPlaying) {
                            handleStop();
                          }
                          setSelectedPersonaId(persona.id);
                          setLastWavBlob(null);
                          setLastGeneratedPersonaId(null);
                          setGeneratedAudioUrl(null);
                          showToast(`Persona aktif: ${persona.name} (${persona.gender} - ${persona.timbreProfile})`, 'info');
                        }}
                        className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between gap-2.5 relative group ${
                          isSelected
                            ? 'bg-gradient-to-br from-purple-900/40 via-slate-900 to-blue-900/30 border-purple-500 shadow-lg shadow-purple-500/15 ring-1 ring-purple-500/40'
                            : 'bg-slate-950/60 border-slate-800/80 hover:border-slate-700 hover:bg-slate-900/60'
                        }`}
                      >
                        <div>
                          <div className="flex items-center justify-between gap-1">
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30 truncate">
                              {persona.tag}
                            </span>
                            <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${persona.gender === 'Wanita' ? 'text-pink-300 bg-pink-950/40 border border-pink-900/40' : 'text-sky-300 bg-sky-950/40 border border-sky-900/40'}`}>
                              {persona.gender}
                            </span>
                          </div>
                          <div className="flex items-center justify-between mt-2">
                            <h3 className="font-bold text-sm text-slate-100">{persona.name}</h3>
                            {isSelected && (
                              <Check className="w-4 h-4 text-purple-400 shrink-0" />
                            )}
                          </div>
                          <p className="text-[11px] text-slate-400 leading-snug mt-1">{persona.desc}</p>
                        </div>

                        {/* Articulation & Timbre Badge */}
                        <div className="pt-2 border-t border-slate-800/60 flex flex-col gap-1.5">
                          <div className="flex items-center justify-between gap-1">
                            <span className="text-[10px] font-semibold text-emerald-300 bg-emerald-950/60 border border-emerald-500/30 px-1.5 py-0.5 rounded-md flex items-center gap-1 truncate">
                              <Sparkles className="w-2.5 h-2.5 text-emerald-400 shrink-0" />
                              {persona.articulationBadge}
                            </span>
                            <span className="text-[10px] text-purple-300/90 font-medium truncate">
                              {persona.timbreProfile}
                            </span>
                          </div>
                          <div className="flex items-center justify-between text-[9px] text-slate-500 font-mono">
                            <span>Base: {persona.voiceName}</span>
                            <span>{persona.pitchShift > 0 ? `+${persona.pitchShift}st` : `${persona.pitchShift}st`}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Script Editor */}
              <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-5 sm:p-6 shadow-2xl relative overflow-hidden backdrop-blur-xl">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <FileText className="w-5 h-5 text-purple-400" />
                    <h2 className="text-base font-bold text-slate-100">Naskah Narasi</h2>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        if (!text.trim()) return;
                        navigator.clipboard.writeText(text);
                        setCopiedText(true);
                        setTimeout(() => setCopiedText(false), 2000);
                        showToast('Teks berhasil disalin ke clipboard!', 'success');
                      }}
                      className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition text-xs font-semibold flex items-center gap-1.5"
                    >
                      {copiedText ? (
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                      <span className="hidden sm:inline">{copiedText ? 'Tersalin' : 'Salin'}</span>
                    </button>

                    <button
                      onClick={() => setText('')}
                      className="p-2 rounded-xl bg-slate-800/80 hover:bg-red-500/20 text-slate-400 hover:text-rose-400 transition text-xs font-semibold flex items-center gap-1.5"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Bersihkan</span>
                    </button>
                  </div>
                </div>

                <textarea
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder="Ketik atau tempel naskah videomu di sini..."
                  rows={6}
                  className="w-full bg-slate-950/70 text-slate-100 border border-slate-800 rounded-2xl p-4 focus:border-purple-500 focus:ring-1 focus:ring-purple-500 focus:outline-none transition font-medium text-base leading-relaxed resize-y min-h-[140px]"
                />

                <div className="mt-4 flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-800/80">
                  <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                    <span className="text-xs text-slate-400 font-semibold flex items-center gap-1">
                      <Wand2 className="w-3.5 h-3.5 text-purple-400" /> Sisipkan:
                    </span>
                    <button
                      onClick={() => setText((p) => p + ' ... ')}
                      className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-mono text-slate-300 transition"
                      title="Jeda bicara"
                    >
                      ... (Jeda)
                    </button>
                    <button
                      onClick={() => setText((p) => p + '! ')}
                      className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-mono text-slate-300 transition"
                      title="Tanda seru"
                    >
                      ! (Seru)
                    </button>
                    <button
                      onClick={() => setText((p) => p + '? ')}
                      className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-mono text-slate-300 transition"
                      title="Tanda tanya"
                    >
                      ? (Tanya)
                    </button>
                  </div>

                  <div className="flex items-center gap-4 text-xs font-medium text-slate-400">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-blue-400" /> ~{estimatedSeconds} detik
                    </span>
                    <span>{wordCount} Kata</span>
                  </div>
                </div>
              </div>

              {/* Visualizer Display */}
              <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-5 shadow-xl flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-400 tracking-wider uppercase flex items-center gap-2">
                    <span
                      className={`w-2 h-2 rounded-full ${
                        isPlaying ? 'bg-emerald-400 animate-ping' : 'bg-slate-600'
                      }`}
                    />
                    Visualizer Spektrum Audio
                  </span>
                  {isPlaying && (
                    <span className="text-xs text-purple-400 font-mono animate-pulse font-semibold">
                      SEDANG MEMUTAR SUARA
                    </span>
                  )}
                </div>
                <div className="h-16 bg-slate-950 rounded-2xl overflow-hidden border border-slate-800 flex items-center justify-center relative">
                  {!isPlaying && (
                    <p className="text-xs text-slate-600 font-medium absolute z-10 pointer-events-none">
                      Tekan "Putar Audio AI" untuk mendengarkan hasil
                    </p>
                  )}
                  <canvas
                    ref={canvasRef}
                    width={600}
                    height={60}
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>
            </div>

            {/* Right Column: Style & Control Panel */}
            <div className="lg:col-span-5 flex flex-col gap-6">
              <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-5 sm:p-6 shadow-2xl backdrop-blur-xl flex flex-col gap-6">
                
                {/* Emotion / Expression Selector (for Gemini mode) */}
                {engineMode === 'gemini' && (
                  <div>
                    <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5 mb-3">
                      <Smile className="w-4 h-4 text-purple-400" />
                      Ekspresi & Suasana Bicara
                    </label>
                    <div className="grid grid-cols-1 gap-2 max-h-[220px] overflow-y-auto pr-1">
                      {EMOTION_STYLES.map((emo) => (
                        <button
                          key={emo.id}
                          onClick={() => setSelectedEmotion(emo.id)}
                          className={`p-2.5 rounded-xl border text-left text-xs font-bold transition flex items-center justify-between ${
                            selectedEmotion === emo.id
                              ? 'bg-purple-600/20 border-purple-500 text-purple-200 shadow-sm'
                              : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-300'
                          }`}
                        >
                          <span>{emo.label}</span>
                          {selectedEmotion === emo.id && (
                            <Check className="w-4 h-4 text-purple-400" />
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* System Voices Dropdown (If browser mode) */}
                {engineMode === 'browser' && (
                  <div>
                    <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5 mb-2">
                      <AudioWaveform className="w-4 h-4 text-purple-400" />
                      Modul Suara Sistem Browser
                    </label>
                    <select
                      value={selectedVoiceURI}
                      onChange={(e) => setSelectedVoiceURI(e.target.value)}
                      className="w-full bg-slate-950 text-slate-100 border border-slate-800 rounded-2xl p-3 text-xs font-medium focus:border-purple-500 focus:outline-none transition shadow-inner cursor-pointer"
                    >
                      <option value="">🔊 Suara Standar System (Otomatis)</option>
                      {voices.map((voice) => (
                        <option key={voice.voiceURI} value={voice.voiceURI}>
                          {voice.name} ({voice.lang})
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Speed & Pitch Controls */}
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-xs font-bold text-slate-300 flex items-center gap-2">
                        <Clock className="w-3.5 h-3.5 text-purple-400" /> Kecepatan (Speed)
                      </span>
                      <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-lg bg-purple-500/20 text-purple-300 border border-purple-500/30">
                        {speed.toFixed(2)}x
                      </span>
                    </div>
                    <input
                      type="range"
                      min="0.5"
                      max="1.8"
                      step="0.05"
                      value={speed}
                      onChange={(e) => setSpeed(parseFloat(e.target.value))}
                      className="w-full h-2 bg-slate-950 rounded-lg appearance-none cursor-pointer accent-purple-500"
                    />
                  </div>

                  {engineMode === 'browser' && (
                    <div>
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-xs font-bold text-slate-300 flex items-center gap-2">
                          <Sliders className="w-3.5 h-3.5 text-blue-400" /> Nada Suara (Pitch)
                        </span>
                        <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-lg bg-blue-500/20 text-blue-300 border border-blue-500/30">
                          {pitch.toFixed(2)}
                        </span>
                      </div>
                      <input
                        type="range"
                        min="0.5"
                        max="1.5"
                        step="0.05"
                        value={pitch}
                        onChange={(e) => setPitch(parseFloat(e.target.value))}
                        className="w-full h-2 bg-slate-950 rounded-lg appearance-none cursor-pointer accent-blue-500"
                      />
                    </div>
                  )}

                  {/* Active Persona Badge */}
                  <div className="p-3 bg-slate-950/80 rounded-2xl border border-slate-800/80 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-semibold">
                        Persona Terpilih
                      </span>
                      <span className="text-xs font-bold text-slate-200">{activePersona.name}</span>
                      <span className="text-[10px] text-emerald-400 font-semibold block mt-0.5">
                        ✨ {activePersona.articulationBadge}
                      </span>
                    </div>
                    <span className="text-[11px] px-2 py-1 rounded-lg bg-purple-500/10 text-purple-300 border border-purple-500/20 font-medium">
                      {activePersona.voiceName}
                    </span>
                  </div>
                </div>

                {/* Main Action Buttons */}
                <div className="pt-2 border-t border-slate-800/80 flex flex-col gap-3">
                  <button
                    onClick={handleSpeak}
                    disabled={isLoadingAi}
                    className={`w-full py-4 px-6 rounded-2xl font-black text-base transition-all shadow-xl flex items-center justify-center gap-3 active:scale-[0.98] ${
                      isPlaying
                        ? 'bg-gradient-to-r from-rose-500 to-red-600 text-white shadow-rose-500/25'
                        : 'bg-gradient-to-r from-purple-600 via-blue-600 to-cyan-500 hover:from-purple-500 hover:to-cyan-400 text-white shadow-purple-500/20'
                    }`}
                  >
                    {isLoadingAi ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        <span>Menggenerasi Suara AI...</span>
                      </>
                    ) : isPlaying ? (
                      <>
                        <Square className="w-5 h-5 fill-current" />
                        <span>Hentikan Suara</span>
                      </>
                    ) : (
                      <>
                        <Play className="w-5 h-5 fill-current" />
                        <span>Putar Audio AI Bahasa Indonesia</span>
                      </>
                    )}
                  </button>

                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={handleDownload}
                      disabled={isLoadingAi}
                      className="py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700/80 text-xs font-bold text-slate-200 transition flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      <Download className="w-4 h-4 text-purple-400" />
                      <span>Unduh File WAV</span>
                    </button>

                    <button
                      onClick={exportSRT}
                      className="py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700/80 text-xs font-bold text-slate-200 transition flex items-center justify-center gap-2"
                    >
                      <Subtitles className="w-4 h-4 text-blue-400" />
                      <span>Export Subtitle</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Templates Tab */}
        {activeTab === 'templates' && (
          <div className="max-w-4xl mx-auto space-y-6">
            <div>
              <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
                <Zap className="w-5 h-5 text-purple-400" />
                Template Naskah Siap Pakai
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                Pilih salah satu template di bawah untuk langsung memuat naskah ke Studio!
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {SCRIPT_TEMPLATES.map((tpl) => (
                <div
                  key={tpl.id}
                  className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 flex flex-col justify-between gap-4 hover:border-purple-500/50 transition shadow-xl"
                >
                  <div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30">
                      {tpl.category}
                    </span>
                    <h3 className="font-bold text-base text-slate-100 mt-2">{tpl.title}</h3>
                    <p className="text-xs text-slate-400 mt-2 leading-relaxed bg-slate-950/60 p-3 rounded-xl border border-slate-800">
                      "{tpl.text}"
                    </p>
                  </div>

                  <button
                    onClick={() => {
                      setText(tpl.text);
                      setActiveTab('editor');
                      showToast(`Template "${tpl.title}" dimuat ke Studio!`, 'success');
                    }}
                    className="w-full py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-purple-600 text-slate-200 hover:text-white font-bold text-xs transition flex items-center justify-center gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Gunakan Naskah Ini</span>
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Music BGM Mixer Tab */}
        {activeTab === 'bgm' && (
          <div className="max-w-3xl mx-auto space-y-6">
            <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 shadow-2xl backdrop-blur-xl">
              <div className="flex items-center gap-3 mb-6">
                <Music className="w-6 h-6 text-purple-400" />
                <div>
                  <h2 className="text-lg font-bold text-slate-100">
                    Background Music (BGM) Mixer
                  </h2>
                  <p className="text-xs text-slate-400">
                    Tambahkan musik latar belakang sintetis secara otomatis saat narasi diputar
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
                {BGM_TRACKS.map((track) => (
                  <button
                    key={track.id}
                    onClick={() => {
                      setSelectedBgm(track.id);
                      showToast(`Musik latar: ${track.name}`, 'info');
                    }}
                    className={`p-4 rounded-2xl border text-left transition flex items-center gap-4 ${
                      selectedBgm === track.id
                        ? 'bg-purple-600/20 border-purple-500 text-white shadow-lg'
                        : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                    }`}
                  >
                    <span className="text-3xl">{track.emoji}</span>
                    <div>
                      <h4 className="font-bold text-sm text-slate-100">{track.name}</h4>
                      <p className="text-[11px] text-slate-400">Looping ambient audio</p>
                    </div>
                  </button>
                ))}
              </div>

              {selectedBgm !== 'none' && (
                <div className="pt-4 border-t border-slate-800 space-y-2">
                  <div className="flex justify-between items-center text-xs font-bold">
                    <span className="text-slate-300">Volume Musik Latar</span>
                    <span className="text-purple-400 font-mono">
                      {Math.round(bgmVolume * 100)}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0.05"
                    max="0.5"
                    step="0.05"
                    value={bgmVolume}
                    onChange={(e) => setBgmVolume(parseFloat(e.target.value))}
                    className="w-full h-2 bg-slate-950 rounded-lg appearance-none cursor-pointer accent-purple-500"
                  />
                </div>
              )}
            </div>
          </div>
        )}

        {/* History Tab */}
        {activeTab === 'history' && (
          <div className="max-w-4xl mx-auto space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-slate-100">Riwayat Audio</h2>
                <p className="text-xs text-slate-400">
                  Daftar naskah dan render audio yang baru saja dibuat
                </p>
              </div>

              {history.length > 0 && (
                <button
                  onClick={clearHistory}
                  className="px-3 py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-400 text-xs font-bold transition flex items-center gap-1.5"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Bersihkan Semua</span>
                </button>
              )}
            </div>

            {history.length === 0 ? (
              <div className="bg-slate-900/50 border border-slate-800 rounded-3xl p-12 text-center text-slate-500">
                <History className="w-12 h-12 mx-auto mb-3 text-slate-600" />
                <p className="font-semibold text-sm">Belum ada riwayat pemutaran</p>
                <p className="text-xs mt-1">
                  Coba buat audio di tab Studio untuk melihat catatan riwayat di sini.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {history.map((item) => (
                  <div
                    key={item.id}
                    className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition hover:border-slate-700"
                  >
                    <div className="space-y-1 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-purple-500/20 text-purple-300">
                          {item.date}
                        </span>
                        <span className="text-xs text-slate-400 font-medium">
                          Suara: {item.voice}
                        </span>
                      </div>
                      <p className="text-xs text-slate-200 line-clamp-2 font-medium">"{item.text}"</p>
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-center">
                      <button
                        onClick={() => {
                          setText(item.text);
                          setActiveTab('editor');
                          showToast('Naskah dimuat kembali!', 'info');
                        }}
                        className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-purple-600 text-slate-200 hover:text-white text-xs font-bold transition"
                      >
                        Muat Ulang
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
